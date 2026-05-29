import { eq, and, gte, or, isNull, lt, sql } from 'drizzle-orm';
import { entries, snapshots } from './db-schema';
import type { Entry, Snapshot } from './db-schema';
import { db } from './db-schema';
import type { BlueskyProfile } from './bluesky';
import { checkAndFlagIfAnomalous } from './anomaly';

// ─── UTC 日時ヘルパー ────────────────────────────────────────────────────────

/** UTC 今日の 00:00:00.000 */
export function utcDayStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** UTC 今週月曜日の 00:00:00.000 */
export function utcWeekStart(date: Date = new Date()): Date {
  const d = utcDayStart(date);
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon, …
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMon);
  return d;
}

// ─── 未記録チェック ──────────────────────────────────────────────────────────

/**
 * 今日（UTC）まだ記録されていないか。
 * null = 一度も記録なし → 未記録扱い
 */
export function isNotRecordedToday(lastSnapshotAt: Date | null): boolean {
  if (!lastSnapshotAt) return true;
  return lastSnapshotAt < utcDayStart();
}

// ─── ゲイン計算 ──────────────────────────────────────────────────────────────

interface GainResult {
  dailyGain: number;
  weeklyGain: number;
  monthlyGain: number;
}

function calcGains(
  recentSnaps: Pick<Snapshot, 'followersCount' | 'capturedAt'>[],
  baselineFollowers: number,
  currentFollowers: number,
  now: Date,
): GainResult {
  const weekStart = utcWeekStart(now);

  // 今週のスナップショット
  const weekSnaps = recentSnaps.filter((s) => new Date(s.capturedAt) >= weekStart);

  // 日次ゲイン = 最新スナップ − 前回スナップ
  // Cron は1日1回のため「今日の最初〜最後」では常に0になる。
  // 直近2件の差分（= 今日 vs 昨日）を使う。
  const dailyGain =
    recentSnaps.length >= 2
      ? recentSnaps.at(-1)!.followersCount - recentSnaps.at(-2)!.followersCount
      : 0;

  const weeklyGain =
    weekSnaps.length >= 2
      ? weekSnaps.at(-1)!.followersCount - weekSnaps[0].followersCount
      : 0;

  // 月間ゲイン = 現在値 − 登録時 baseline
  const monthlyGain = Math.max(0, currentFollowers - baselineFollowers);

  return { dailyGain, weeklyGain, monthlyGain };
}

// ─── コアロジック: スナップショット 1 件を記録 ───────────────────────────────

export interface SnapshotResult {
  snapshot: Snapshot;
  gains: GainResult;
  isCompleted: boolean;
  isFlagged: boolean;
}

/**
 * フォロワー数を 1 件記録し、集計キャッシュと profile を更新する。
 *
 * 処理フロー:
 *  1. snapshots に INSERT
 *  2. 直近 7 日分のスナップショットを取得してゲイン計算
 *  3. entries の集計キャッシュ・profile・lastSnapshotAt を一括 UPDATE
 *  4. 30 日経過なら is_completed = true
 */
export async function recordSnapshot(
  entry: Entry,
  profile: BlueskyProfile,
  followersCount: number,
): Promise<SnapshotResult> {
  const now = new Date();

  // 1. snapshots INSERT
  const [snap] = await db
    .insert(snapshots)
    .values({ entryId: entry.id, followersCount, capturedAt: now })
    .returning();

  // 2. 直近 7 日分のスナップショットを取得（新規挿入分を含む）
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const recentSnaps = await db
    .select({ followersCount: snapshots.followersCount, capturedAt: snapshots.capturedAt })
    .from(snapshots)
    .where(
      and(
        eq(snapshots.entryId, entry.id),
        gte(snapshots.capturedAt, sevenDaysAgo),
      ),
    )
    .orderBy(snapshots.capturedAt); // ASC

  // 3. ゲイン計算（過去最高のみ更新）
  const gains = calcGains(recentSnaps, entry.baselineFollowers, followersCount, now);
  const newMaxDaily = Math.max(gains.dailyGain, entry.maxDailyGain ?? 0);
  const newMaxWeekly = Math.max(gains.weeklyGain, entry.maxWeeklyGain ?? 0);
  const newMaxMonthly = Math.max(gains.monthlyGain, entry.maxMonthlyGain ?? 0);

  // 30 日終了チェック
  const isCompleted = now >= entry.endsAt;

  // 4. entries 一括 UPDATE（ハンドル変更対策: profile は常に最新値で上書き）
  await db
    .update(entries)
    .set({
      handle: profile.handle,
      displayName: profile.displayName ?? null,
      avatar: profile.avatar ?? null,
      currentFollowers: followersCount,
      lastSnapshotAt: now,
      maxDailyGain: newMaxDaily,
      maxWeeklyGain: newMaxWeekly,
      maxMonthlyGain: newMaxMonthly,
      isCompleted,
    })
    .where(eq(entries.id, entry.id));

  let isFlagged = false;
  try {
    isFlagged = await checkAndFlagIfAnomalous(entry.id);
    if (isFlagged) console.warn(`[anomaly] entry ${entry.id} (${entry.did}) flagged as anomalous`);
  } catch (err) {
    console.error(`[anomaly] check failed for entry ${entry.id}:`, err);
  }

  return { snapshot: snap, gains, isCompleted, isFlagged };
}

// ─── Cron 用: 未記録アクティブエントリーをバッチ取得 ─────────────────────────

/**
 * 当日未記録（lastSnapshotAt IS NULL または < 今日 UTC 0:00）の
 * アクティブ・非 Ban エントリーを古い順に最大 limit 件返す。
 */
export async function getUnrecordedActiveEntries(limit: number): Promise<Entry[]> {
  const todayStart = utcDayStart();
  return db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.isCompleted, false),
        eq(entries.isBanned, false),
        or(
          isNull(entries.lastSnapshotAt),
          lt(entries.lastSnapshotAt, todayStart),
        ),
      ),
    )
    .orderBy(sql`${entries.lastSnapshotAt} ASC NULLS FIRST`)
    .limit(limit);
}

// ─── Lazy Fetch 用: エントリー + 直近スナップショット取得 ────────────────────

/** 直近 n 件のスナップショットを返す */
export async function getRecentSnapshots(
  entryId: number,
  limit = 30,
): Promise<Snapshot[]> {
  return db
    .select()
    .from(snapshots)
    .where(eq(snapshots.entryId, entryId))
    .orderBy(sql`${snapshots.capturedAt} DESC`)
    .limit(limit);
}
