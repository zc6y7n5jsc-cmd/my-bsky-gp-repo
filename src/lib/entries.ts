import { eq, and } from 'drizzle-orm';
import { entries, snapshots } from './db-schema';
import type { Entry } from './db-schema';
import { db } from './db-schema';
import { determineClass, RACE_DURATION_DAYS } from './constants';
import { getCurrentSeason } from './season';
import type { BlueskyProfile } from './bluesky';

/**
 * 指定 DID の進行中エントリーを返す（なければ null）。
 * ハンドル変更対策: handle / display_name / avatar は返さず DID でのみ判定。
 */
export async function getActiveEntry(did: string): Promise<Entry | null> {
  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.did, did), eq(entries.isCompleted, false)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 参加登録。
 * - baseline フォロワー数でクラスを確定
 * - entries + 初回 snapshot をトランザクションで一括 INSERT
 * - handle / display_name / avatar は Bluesky API の最新値で登録
 *
 * @throws {Error} DB の一意制約違反（既に参加中）の場合
 */
export async function registerEntry(
  did: string,
  profile: BlueskyProfile,
): Promise<Entry> {
  const followersCount = profile.followersCount ?? 0;
  const entryClass = determineClass(followersCount);
  const season = getCurrentSeason();

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setUTCDate(endsAt.getUTCDate() + RACE_DURATION_DAYS);

  // neon-http はトランザクション未対応のため順次 INSERT
  const [entry] = await db
    .insert(entries)
    .values({
      did,
      handle: profile.handle,
      displayName: profile.displayName ?? null,
      avatar: profile.avatar ?? null,
      class: entryClass,
      baselineFollowers: followersCount,
      season,
      startedAt: now,
      endsAt,
      isCompleted: false,
      isFlagged: false,
      isBanned: false,
      currentFollowers: followersCount,
      maxDailyGain: 0,
      maxWeeklyGain: 0,
      maxMonthlyGain: 0,
    })
    .returning();

  // 初回スナップショット（= baseline）を記録
  // neon-http はトランザクション非対応のため、失敗時は entry を補償削除して
  // 「baseline スナップショットのない孤立 entry」が残らないようにする。
  try {
    await db.insert(snapshots).values({
      entryId: entry.id,
      followersCount,
      capturedAt: now,
    });
  } catch (err) {
    await db.delete(entries).where(eq(entries.id, entry.id)).catch(() => {});
    throw err;
  }

  return entry;
}

// NOTE: markCompletedIfExpired / syncProfileToEntry / getUnrecordedActiveEntries は
// src/lib/snapshot.ts で recordSnapshot() に統合しています。
