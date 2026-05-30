import { NextRequest, NextResponse } from 'next/server';

/**
 * 軽量なインメモリ固定ウィンドウ・レートリミッタ。
 *
 * ⚠️ 制約: Vercel Fluid / サーバレスでは状態がインスタンス毎なので
 * グローバルに厳密な制限はかからない（ベストエフォート）。
 * 厳密な制限が必要なら Upstash Redis 等の共有ストアへ移行すること。
 * それでも、単一インスタンスに対するバースト/暴走クライアントの抑制には有効。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // 秒
}

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/**
 * レート制限チェック。超過時は 429 レスポンスを返し、許可時は null を返す。
 *
 * @example
 *   const limited = checkRateLimit(req, { name: 'rankings', limit: 60, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function checkRateLimit(
  req: NextRequest,
  opts: { name: string; limit: number; windowMs: number; key?: string },
): NextResponse | null {
  const id = opts.key ?? getClientIp(req);
  const { ok, retryAfter } = hit(`${opts.name}:${id}`, opts.limit, opts.windowMs);
  if (ok) return null;
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
