import { withBackoff, type HttpError } from './backoff';

export interface BlueskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  description?: string;
}

export interface FetchProfileOptions {
  /** true = キャッシュを使わず必ず最新値を取得（参加登録・スナップショット記録時） */
  fresh?: boolean;
  /** true = Exponential Backoff でリトライ（Cron/Lazy Fetch 用） */
  withRetry?: boolean;
}

const PUBLIC_API = 'https://public.api.bsky.app/xrpc';

/** HTTP レスポンスを解析して HttpError を throw するか null を返す */
async function handleResponse(res: Response): Promise<BlueskyProfile | null> {
  // 永久失敗（Not Found など）: null を返してリトライしない
  if (res.status === 404 || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
    return null;
  }

  // リトライ対象エラー（429 / 5xx）: HttpError を throw
  if (res.status === 429 || res.status >= 500) {
    const err = new Error(`Bluesky API HTTP ${res.status}`) as HttpError;
    err.status = res.status;
    err.retryAfter = res.headers.get('Retry-After');
    throw err;
  }

  if (!res.ok) return null;

  const data = await res.json();
  return {
    did: data.did,
    handle: data.handle,
    displayName: data.displayName,
    avatar: data.avatar,
    followersCount: data.followersCount,
    followsCount: data.followsCount,
    postsCount: data.postsCount,
    description: data.description,
  };
}

/** 内部: キャッシュなしで 1 回だけ取得（throw on retriable errors） */
async function fetchRaw(did: string): Promise<BlueskyProfile | null> {
  const url = `${PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  return handleResponse(res);
}

/**
 * Bluesky 公開 API からプロフィールを取得する。
 * - `fresh: true` → キャッシュなし（登録時・スナップショット記録時に使用）
 * - `withRetry: true` → Exponential Backoff でリトライ（Cron/Lazy Fetch 用）
 * - 永久失敗（404 等）や最終リトライ失敗時は null を返す
 */
export async function fetchBlueskyProfile(
  did: string,
  { fresh = false, withRetry = false }: FetchProfileOptions = {},
): Promise<BlueskyProfile | null> {
  if (withRetry || fresh) {
    try {
      return await withBackoff(() => fetchRaw(did), {
        maxRetries: withRetry ? 3 : 0,
        initialDelayMs: 1_000,
        maxDelayMs: 16_000,
      });
    } catch {
      // 最終リトライ失敗 → null
      return null;
    }
  }

  // 通常取得（60 秒キャッシュ）
  const url = `${PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      did: data.did,
      handle: data.handle,
      displayName: data.displayName,
      avatar: data.avatar,
      followersCount: data.followersCount,
    };
  } catch {
    return null;
  }
}
