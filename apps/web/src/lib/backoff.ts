export interface BackoffOptions {
  maxRetries?: number;
  /** 初回遅延 ms */
  initialDelayMs?: number;
  /** 遅延の上限 ms */
  maxDelayMs?: number;
}

/** 関数が投げる Error に追加する HTTP 情報 */
export interface HttpError extends Error {
  status?: number;
  /** Retry-After ヘッダー値（秒単位の文字列） */
  retryAfter?: string | null;
}

/**
 * Exponential Backoff でリトライするラッパー。
 *
 * - 429 (rate limit): Retry-After ヘッダーがあればそれを優先
 * - 5xx: バックオフ後リトライ
 * - それ以外の Error: リトライせず即座に throw
 * - maxRetries 回消費後も失敗したら最後の Error を throw
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = {},
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1_000, maxDelayMs = 16_000 } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;

      const httpErr = err as HttpError;
      const status = httpErr.status;

      // リトライ対象外のエラー（4xx で 429 以外、ネットワーク以外の論理エラー）
      if (status !== undefined && status !== 429 && status < 500) {
        throw err;
      }

      if (attempt === maxRetries) break;

      // 遅延計算: 2^attempt 秒、上限は maxDelayMs
      let delayMs = initialDelayMs * 2 ** attempt;

      // 429 の場合は Retry-After ヘッダーを優先
      if (status === 429 && httpErr.retryAfter) {
        const ra = parseInt(httpErr.retryAfter, 10);
        if (!isNaN(ra)) delayMs = ra * 1_000;
      }

      delayMs = Math.min(delayMs, maxDelayMs);
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastErr;
}
