import { eq, and, desc, asc } from 'drizzle-orm';
import { entries, champions } from '@bsky-gp/db/schema';
import { db } from './db';
import type { EntryClass } from './constants';

export const CLASS_DISPLAY_ORDER: EntryClass[] = [
  'Star', 'Influencer', 'Established', 'Challenger', 'Rising', 'Rookie',
];

export interface ChampionRow {
  id: number;
  season: number;
  class: string;
  entryId: number;
  totalGain: number;
  decidedAt: Date;
  handle: string;
  displayName: string | null;
  avatar: string | null;
  did: string;
}

export async function getChampions(season: number): Promise<ChampionRow[]> {
  const rows = await db
    .select({
      id: champions.id,
      season: champions.season,
      class: champions.class,
      entryId: champions.entryId,
      totalGain: champions.totalGain,
      decidedAt: champions.decidedAt,
      handle: entries.handle,
      displayName: entries.displayName,
      avatar: entries.avatar,
      did: entries.did,
    })
    .from(champions)
    .innerJoin(entries, eq(champions.entryId, entries.id))
    .where(eq(champions.season, season));

  return rows.sort((a, b) => {
    const ai = CLASS_DISPLAY_ORDER.indexOf(a.class as EntryClass);
    const bi = CLASS_DISPLAY_ORDER.indexOf(b.class as EntryClass);
    return ai - bi;
  });
}

export async function getAvailableSeasons(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ season: champions.season })
    .from(champions)
    .orderBy(desc(champions.season));
  return rows.map((r) => r.season);
}

/**
 * シーズン終了後に呼び出す。各クラスの月間ゲイン最大エントリーを champion に記録する。
 * 同点タイブレーク: 先に開始したエントリー（startedAt が早い方）を優先。
 * 既存レコードは削除してから再挿入（べき等）。
 */
export async function decideChampions(season: number): Promise<void> {
  const eligible = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.season, season),
        eq(entries.isCompleted, true),
        eq(entries.isBanned, false),
        eq(entries.isFlagged, false),
      ),
    )
    .orderBy(desc(entries.maxMonthlyGain), asc(entries.startedAt));

  // Pick the best entry per class (already sorted: highest gain first, then earliest start)
  const byClass = new Map<string, typeof eligible[0]>();
  for (const entry of eligible) {
    if (!byClass.has(entry.class)) {
      byClass.set(entry.class, entry);
    }
  }

  await db.delete(champions).where(eq(champions.season, season));

  const now = new Date();
  for (const [cls, entry] of byClass.entries()) {
    await db.insert(champions).values({
      season,
      class: cls,
      entryId: entry.id,
      totalGain: entry.maxMonthlyGain ?? 0,
      decidedAt: now,
    });
  }
}
