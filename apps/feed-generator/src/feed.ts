import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, desc, asc } from 'drizzle-orm';
import * as schema from '@bsky-gp/db/schema';

const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';
const BATCH_CONCURRENCY = 10; // max parallel Bluesky API calls

export interface FeedItem {
  post: string; // at:// URI
}

export interface FeedResult {
  feed: FeedItem[];
  cursor?: string;
}

/**
 * 1人の参加者の最新投稿URI を取得する。
 * 返信・リポストは除外。失敗時は null を返す。
 */
async function getLatestPostUri(did: string): Promise<string | null> {
  try {
    const url =
      `${BSKY_PUBLIC_API}/app.bsky.feed.getAuthorFeed` +
      `?actor=${encodeURIComponent(did)}&limit=5&filter=posts_no_replies`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      feed?: Array<{ post: { uri: string; indexedAt: string } }>;
    };

    return data.feed?.[0]?.post?.uri ?? null;
  } catch {
    return null;
  }
}

/**
 * DID リストに対してバッチでBluesky API を叩き、
 * 最新投稿URIのマップを返す（失敗したDIDは含まない）。
 */
async function batchGetPostUris(dids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (let i = 0; i < dids.length; i += BATCH_CONCURRENCY) {
    const batch = dids.slice(i, i + BATCH_CONCURRENCY);
    const entries = await Promise.all(
      batch.map(async (did) => ({ did, uri: await getLatestPostUri(did) })),
    );
    for (const { did, uri } of entries) {
      if (uri) result.set(did, uri);
    }
  }

  return result;
}

/**
 * フィードスケルトンを構築する。
 *
 * - 参加者を max_monthly_gain DESC でソート
 * - cursor = btoa(offset) でページネーション
 * - limit 件の参加者を確認し、投稿がある人を順に返す
 */
export async function buildFeed(
  databaseUrl: string,
  limit: number,
  cursor: string | null,
): Promise<FeedResult> {
  // Decode cursor → offset
  let offset = 0;
  if (cursor) {
    try {
      const decoded = parseInt(atob(cursor), 10);
      if (!isNaN(decoded) && decoded >= 0) offset = decoded;
    } catch {
      // ignore invalid cursor
    }
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  // 対象参加者（ban/flagされていないもの）を月間ゲイン順に取得
  const participants = await db
    .select({ did: schema.entries.did })
    .from(schema.entries)
    .where(
      and(
        eq(schema.entries.isBanned, false),
        eq(schema.entries.isFlagged, false),
      ),
    )
    .orderBy(desc(schema.entries.maxMonthlyGain), asc(schema.entries.handle))
    .limit(limit)
    .offset(offset);

  if (participants.length === 0) {
    return { feed: [] };
  }

  // Bluesky API から最新投稿を並行取得（失敗者はスキップ）
  const postUriMap = await batchGetPostUris(participants.map((p) => p.did));

  // ランク順を維持しながらフィードアイテムを組み立てる
  const feed: FeedItem[] = participants
    .map(({ did }) => postUriMap.get(did))
    .filter((uri): uri is string => uri !== undefined)
    .map((uri) => ({ post: uri }));

  // 次のカーソルは「今回チェックした参加者数分だけ進める」
  const nextCursor =
    participants.length === limit
      ? btoa(String(offset + limit))
      : undefined;

  return { feed, cursor: nextCursor };
}
