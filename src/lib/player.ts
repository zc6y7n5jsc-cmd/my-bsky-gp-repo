import { eq, desc, asc, inArray } from 'drizzle-orm';
import { entries, snapshots, oauthSessions } from './db-schema';
import type { Entry, Snapshot } from './db-schema';
import { db } from './db-schema';

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

/**
 * エントリーの「直近 limit 件」のスナップショットを古い順で返す（グラフ用）。
 *
 * DESC + LIMIT で最新側を取得してから昇順へ並べ替える。
 * （ASC + LIMIT だと最古の limit 件になり、最新日が欠落する）
 */
export async function getSnapshotsAsc(entryId: number, limit = 30): Promise<Snapshot[]> {
  const rows = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.entryId, entryId))
    .orderBy(desc(snapshots.capturedAt))
    .limit(limit);
  return rows.reverse();
}

/**
 * ユーザーの全データを削除。
 * entries は CASCADE で snapshots も連動削除。
 * OAuth セッションも削除。
 */
export async function deleteUserData(did: string): Promise<void> {
  // neon-http はトランザクション未対応のため順次 DELETE
  // CASCADE が DB になければ snapshots を先に明示削除
  const userEntries = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.did, did));

  if (userEntries.length > 0) {
    const ids = userEntries.map((e) => e.id);
    await db.delete(snapshots).where(inArray(snapshots.entryId, ids));
  }

  await db.delete(entries).where(eq(entries.did, did));
  await db.delete(oauthSessions).where(eq(oauthSessions.key, did));
}
