import { eq, desc, asc } from 'drizzle-orm';
import { entries, snapshots, oauthSessions } from '@bsky-gp/db/schema';
import type { Entry, Snapshot } from '@bsky-gp/db/schema';
import { db } from './db';

/** DID の全エントリー（新しい順）— 過去の挑戦履歴用 */
export async function getAllEntriesForDid(did: string): Promise<Entry[]> {
  return db
    .select()
    .from(entries)
    .where(eq(entries.did, did))
    .orderBy(desc(entries.startedAt));
}

/**
 * DID の最新エントリー（active 優先、なければ最新 completed）。
 * 公開プロフィールページ用。
 */
export async function getLatestEntryForDid(did: string): Promise<Entry | null> {
  // isCompleted ASC → false (active) が先に来る
  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.did, did))
    .orderBy(asc(entries.isCompleted), desc(entries.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** エントリーのスナップショットを古い順で返す（グラフ用）*/
export async function getSnapshotsAsc(entryId: number, limit = 30): Promise<Snapshot[]> {
  return db
    .select()
    .from(snapshots)
    .where(eq(snapshots.entryId, entryId))
    .orderBy(asc(snapshots.capturedAt))
    .limit(limit);
}

/**
 * ユーザーの全データを削除。
 * entries は CASCADE で snapshots も連動削除。
 * OAuth セッションも削除。
 */
export async function deleteUserData(did: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(entries).where(eq(entries.did, did));
    await tx.delete(oauthSessions).where(eq(oauthSessions.key, did));
  });
}
