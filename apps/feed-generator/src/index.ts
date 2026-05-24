import { buildFeed } from './feed';

export interface Env {
  DATABASE_URL: string;
  /** did:web:<FEED_HOSTNAME> 形式 — 例: did:web:feed.bsky-gp.vercel.app */
  FEED_DID: string;
  /** Feed Generator のホスト名 — 例: feed.bsky-gp.vercel.app */
  FEED_HOSTNAME: string;
}

// フィード識別子（DID配下の generator レコード名）
const FEED_RKEY = 'bsky-gp';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200, extra?: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

function xrpcError(code: string, message: string, status: number): Response {
  return json({ error: code, message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // ── DID ドキュメント ────────────────────────────────────────────────
    if (pathname === '/.well-known/did.json') {
      return json({
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: env.FEED_DID,
        service: [
          {
            id: '#bsky_fg',
            type: 'BskyFeedGenerator',
            serviceEndpoint: `https://${env.FEED_HOSTNAME}`,
          },
        ],
      });
    }

    // ── Feed Generator の自己記述 ────────────────────────────────────────
    if (pathname === '/xrpc/app.bsky.feed.describeFeedGenerator') {
      return json({
        did: env.FEED_DID,
        feeds: [
          {
            uri: `at://${env.FEED_DID}/app.bsky.feed.generator/${FEED_RKEY}`,
          },
        ],
      });
    }

    // ── getFeedSkeleton ──────────────────────────────────────────────────
    if (pathname === '/xrpc/app.bsky.feed.getFeedSkeleton') {
      // --- feed パラメータ検証 ---
      const feedParam = url.searchParams.get('feed');
      const expectedFeedUri = `at://${env.FEED_DID}/app.bsky.feed.generator/${FEED_RKEY}`;
      if (!feedParam || feedParam !== expectedFeedUri) {
        return xrpcError(
          'UnknownFeed',
          `Unknown feed: ${feedParam ?? '(none)'}`,
          400,
        );
      }

      // --- limit パラメータ ---
      const limitRaw = url.searchParams.get('limit');
      let limit = 30;
      if (limitRaw !== null) {
        limit = parseInt(limitRaw, 10);
        if (isNaN(limit) || limit < 1) {
          return xrpcError('InvalidRequest', 'limit must be a positive integer', 400);
        }
        limit = Math.min(limit, 100);
      }

      // --- cursor パラメータ ---
      const cursor = url.searchParams.get('cursor') ?? null;

      // --- DATABASE_URL チェック ---
      if (!env.DATABASE_URL) {
        console.error('[getFeedSkeleton] DATABASE_URL is not configured');
        return xrpcError('InternalServerError', 'Service misconfigured', 500);
      }

      try {
        const result = await buildFeed(env.DATABASE_URL, limit, cursor);

        // Cloudflare Edge キャッシング: 1時間
        return json(result, 200, {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'Vary': 'Accept-Encoding',
        });
      } catch (err) {
        console.error('[getFeedSkeleton] DB error:', err);
        return xrpcError('InternalServerError', 'Failed to build feed', 500);
      }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};
