import { eq, and, or, gt, lt, desc, asc, sql, inArray, gte } from 'drizzle-orm';
import { entries, snapshots } from './db-schema';
import type { Entry } from './db-schema';
import { db } from './db-schema';
import type { EntryClass } from './constants';

// ─── 公開型 ──────────────────────────────────────────────────────────────────

export type RankingPeriod = 'daily' | 'weekly' | 'monthly';
export type RankingClass = EntryClass | 'all';

export interface RankingRow {
  rank: number;
  did: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
  class: string;
  gain: number;
  baselineFollowers: number;
  currentFollowers: number | null;
  endsAt: Date;
  isCompleted: boolean;
  lastSnapshotAt: Date | null;
}

export interface RankingsResult {
  rankings: RankingRow[];
  /** is_banned を除いた有効エントリーの総数（is_flagged は除外しない） */
  total: number;
  page: number;
  pageSize: number;
  /** 最終スナップショット記録時刻（ランキング鮮度の表示用） */
  lastUpdatedAt: Date | null;
}

export interface AroundMeResult {
  myRank: RankingRow | null;
  around: RankingRow[];
}

export interface DeadHeatResult {
  first: RankingRow;
  second: RankingRow;
  diff: number;
}

export interface ChartDataEntry {
  handle: string;
  displayName: string | null;
  data: { date: string; gain: number }[];
}

// ─── 内部ヘルパー ─────────────────────────────────────────────────────────────

const VALID_PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly'];
const VALID_CLASSES: RankingClass[] = [
  'all', 'Rookie', 'Rising', 'Challenger', 'Established', 'Influencer', 'Star',
];

export function isValidPeriod(v: unknown): v is RankingPeriod {
  return VALID_PERIODS.includes(v as RankingPeriod);
}
export function isValidClass(v: unknown): v is RankingClass {
  return VALID_CLASSES.includes(v as RankingClass);
}

/** period に対応する集計カラムを返す */
function gainColumn(period: RankingPeriod) {
  switch (period) {
    case 'daily':   return entries.maxDailyGain;
    case 'weekly':  return entries.maxWeeklyGain;
    case 'monthly': return entries.maxMonthlyGain;
  }
}

/** entry からゲイン数値を取り出す */
function entryGain(entry: Entry, period: RankingPeriod): number {
  switch (period) {
    case 'daily':   return entry.maxDailyGain ?? 0;
    case 'weekly':  return entry.maxWeeklyGain ?? 0;
    case 'monthly': return entry.maxMonthlyGain ?? 0;
  }
}

/**
 * is_banned を除外する基本 WHERE 句を構築。
 *
 * is_flagged（異常検知の自動フラグ）は除外しない。
 * z-score ベースのヒューリスティックは正当なバズを誤検知し得るため、
 * フラグは管理者レビュー用のシグナルに留め、確定的な不正は管理者が
 * is_banned を立てて初めてランキングから除外する。
 */
function buildBaseWhere(classFilter: RankingClass) {
  const conditions = [
    eq(entries.isBanned, false),
  ] as const;

  if (classFilter === 'all') {
    return and(...conditions);
  }
  return and(...conditions, eq(entries.class, classFilter));
}

/** SELECT するカラムの定義（両エンドポイントで共通） */
const SELECT_COLS = {
  did:              entries.did,
  handle:           entries.handle,
  displayName:      entries.displayName,
  avatar:           entries.avatar,
  class:            entries.class,
  baselineFollowers: entries.baselineFollowers,
  currentFollowers: entries.currentFollowers,
  endsAt:           entries.endsAt,
  isCompleted:      entries.isCompleted,
  lastSnapshotAt:   entries.lastSnapshotAt,
  maxDailyGain:     entries.maxDailyGain,
  maxWeeklyGain:    entries.maxWeeklyGain,
  maxMonthlyGain:   entries.maxMonthlyGain,
} as const;

type RawRow = {
  did: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
  class: string;
  baselineFollowers: number;
  currentFollowers: number | null;
  endsAt: Date;
  isCompleted: boolean;
  lastSnapshotAt: Date | null;
  maxDailyGain: number | null;
  maxWeeklyGain: number | null;
  maxMonthlyGain: number | null;
};

function toRankingRow(raw: RawRow, rank: number, period: RankingPeriod): RankingRow {
  let gain = 0;
  switch (period) {
    case 'daily':   gain = raw.maxDailyGain ?? 0;   break;
    case 'weekly':  gain = raw.maxWeeklyGain ?? 0;  break;
    case 'monthly': gain = raw.maxMonthlyGain ?? 0; break;
  }
  return {
    rank,
    did:              raw.did,
    handle:           raw.handle,
    displayName:      raw.displayName,
    avatar:           raw.avatar,
    class:            raw.class,
    gain,
    baselineFollowers: raw.baselineFollowers,
    currentFollowers: raw.currentFollowers,
    endsAt:           raw.endsAt,
    isCompleted:      raw.isCompleted,
    lastSnapshotAt:   raw.lastSnapshotAt,
  };
}

// ─── 公開関数 ─────────────────────────────────────────────────────────────────

/**
 * ランキング取得。
 * - is_banned = FALSE のエントリーのみ対象（is_flagged は除外しない）
 * - 完了済みエントリーも含む（歴代ランキング）
 * - 同ゲイン数は handle の辞書順でタイブレーク
 */
export async function getRankings(
  classFilter: RankingClass,
  period: RankingPeriod,
  page = 1,
  pageSize = 100,
): Promise<RankingsResult> {
  const gainCol = gainColumn(period);
  const where = buildBaseWhere(classFilter);
  const offset = (page - 1) * pageSize;

  // 総数取得（ページ 1 以外でも total を返すため常に実行）
  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(entries)
    .where(where);
  const total = countRow?.total ?? 0;

  // ランキング取得（ゲイン DESC, handle ASC でタイブレーク）
  const rows = await db
    .select(SELECT_COLS)
    .from(entries)
    .where(where)
    .orderBy(desc(gainCol), asc(entries.handle))
    .limit(pageSize)
    .offset(offset);

  const rankings = rows.map((row, idx) => toRankingRow(row, offset + idx + 1, period));

  // ランキング鮮度: 取得した行の中で最も新しい lastSnapshotAt
  const lastUpdatedAt = rankings.reduce<Date | null>((latest, r) => {
    if (!r.lastSnapshotAt) return latest;
    if (!latest) return r.lastSnapshotAt;
    return r.lastSnapshotAt > latest ? r.lastSnapshotAt : latest;
  }, null);

  return { rankings, total, page, pageSize, lastUpdatedAt };
}

/**
 * 周辺ランキング取得（自分の前後 5 名 = 計 11 人）。
 *
 * rank 算出: 自分より gain が大きい（またはゲイン同値で handle が辞書的に前）
 * エントリー数 + 1
 */
export async function getRankAroundUser(
  did: string,
  classFilter: RankingClass,
  period: RankingPeriod,
): Promise<AroundMeResult> {
  const gainCol = gainColumn(period);
  const where = buildBaseWhere(classFilter);

  // 1. 自分のエントリーを取得（banned/flagged チェック含む）
  const [userEntry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.did, did), where))
    .limit(1);

  if (!userEntry) return { myRank: null, around: [] };

  const userGain = entryGain(userEntry, period);

  // 2. 自分より上位のエントリー数（= rank - 1）を算出
  //    同ゲインで handle が辞書的に前のエントリーも「上位」扱い（タイブレーク準拠）
  const [aboveRow] = await db
    .select({ above: sql<number>`count(*)::int` })
    .from(entries)
    .where(
      and(
        where,
        or(
          gt(gainCol, userGain),
          and(
            sql`coalesce(${gainCol}, 0) = ${userGain}`,
            lt(entries.handle, userEntry.handle),
          ),
        ),
      ),
    );

  const above = aboveRow?.above ?? 0;
  const myRankNum = above + 1;

  // 3. 前後 5 名を含む 11 件を OFFSET で取得
  //    offset は「自分の 5 つ前」から、ただし 0 未満にはしない
  const windowOffset = Math.max(0, myRankNum - 1 - 5);

  const rows = await db
    .select(SELECT_COLS)
    .from(entries)
    .where(where)
    .orderBy(desc(gainCol), asc(entries.handle))
    .limit(11)
    .offset(windowOffset);

  const around = rows.map((row, idx) => toRankingRow(row, windowOffset + idx + 1, period));
  const myRank = around.find((r) => r.did === did) ?? null;

  return { myRank, around };
}

/**
 * 参加者数（banned を除く全エントリー数）。
 */
export async function getParticipantCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entries)
    .where(eq(entries.isBanned, false));
  return row?.count ?? 0;
}

/**
 * デッドヒート枠: 上位 100 件の中で最も僅差の連続ランクペアを返す。
 */
export async function getDeadHeat(
  classFilter: RankingClass,
  period: RankingPeriod,
): Promise<DeadHeatResult | null> {
  const gainCol = gainColumn(period);
  const where = buildBaseWhere(classFilter);

  const rows = await db
    .select(SELECT_COLS)
    .from(entries)
    .where(where)
    .orderBy(desc(gainCol), asc(entries.handle))
    .limit(100);

  if (rows.length < 2) return null;

  const ranked = rows.map((raw, i) => toRankingRow(raw, i + 1, period));

  let minDiff = Infinity;
  let best: DeadHeatResult | null = null;

  for (let i = 0; i < ranked.length - 1; i++) {
    const diff = ranked[i].gain - ranked[i + 1].gain;
    if (diff < minDiff) {
      minDiff = diff;
      best = { first: ranked[i], second: ranked[i + 1], diff };
    }
  }

  return best;
}

/**
 * トップ 3 エントリーの過去 30 日スナップショット（グラフ用）。
 */
export async function getTop3ChartData(
  classFilter: RankingClass,
  period: RankingPeriod,
): Promise<ChartDataEntry[]> {
  const gainCol = gainColumn(period);
  const where = buildBaseWhere(classFilter);

  const top3 = await db
    .select({ ...SELECT_COLS, id: entries.id })
    .from(entries)
    .where(where)
    .orderBy(desc(gainCol), asc(entries.handle))
    .limit(3);

  if (top3.length === 0) return [];

  const entryIds = top3.map((e) => e.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const snaps = await db
    .select({
      entryId: snapshots.entryId,
      followersCount: snapshots.followersCount,
      capturedAt: snapshots.capturedAt,
    })
    .from(snapshots)
    .where(and(inArray(snapshots.entryId, entryIds), gte(snapshots.capturedAt, thirtyDaysAgo)))
    .orderBy(asc(snapshots.capturedAt));

  const snapsByEntry = new Map<number, typeof snaps>();
  for (const snap of snaps) {
    if (!snapsByEntry.has(snap.entryId)) snapsByEntry.set(snap.entryId, []);
    snapsByEntry.get(snap.entryId)!.push(snap);
  }

  return top3.map((entry) => ({
    handle: entry.handle,
    displayName: entry.displayName,
    data: (snapsByEntry.get(entry.id) ?? []).map((snap) => ({
      date: snap.capturedAt.toISOString().split('T')[0],
      gain: snap.followersCount - entry.baselineFollowers,
    })),
  }));
}

/**
 * ランキング最終更新日時（全体で最新の last_snapshot_at）。
 * ランキングページのヘッダーに表示する用途。
 */
export async function getLastUpdatedAt(): Promise<Date | null> {
  const [row] = await db
    .select({ latest: sql<Date>`max(last_snapshot_at)` })
    .from(entries)
    .where(eq(entries.isBanned, false));
  return row?.latest ?? null;
}
