import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { type InferSelectModel, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// ─── Schema ───────────────────────────────────────────────────────────────────

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  did: text('did').notNull(),
  handle: text('handle').notNull(),
  displayName: text('display_name'),
  avatar: text('avatar'),
  class: text('class').notNull(),
  baselineFollowers: integer('baseline_followers').notNull(),
  currentFollowers: integer('current_followers'),
  maxDailyGain: integer('max_daily_gain'),
  maxWeeklyGain: integer('max_weekly_gain'),
  maxMonthlyGain: integer('max_monthly_gain'),
  lastSnapshotAt: timestamp('last_snapshot_at'),
  startedAt: timestamp('started_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  isFlagged: boolean('is_flagged').notNull().default(false),
  isBanned: boolean('is_banned').notNull().default(false),
  season: integer('season').notNull(),
}, (table) => [
  // 1 DID につき同時に進行できる挑戦は 1 つだけ（参加登録の重複防止）。
  // 部分ユニーク: is_completed = false の行のみ対象。
  uniqueIndex('entries_did_active_idx').on(table.did).where(sql`${table.isCompleted} = false`),
  // 履歴・最新エントリー取得（did で絞り込み）。
  index('entries_did_idx').on(table.did),
  // ランキングのソート/絞り込み（is_banned で除外 → gain DESC, handle ASC）。
  index('entries_daily_rank_idx').on(table.maxDailyGain, table.handle),
  index('entries_weekly_rank_idx').on(table.maxWeeklyGain, table.handle),
  index('entries_monthly_rank_idx').on(table.maxMonthlyGain, table.handle),
  index('entries_class_idx').on(table.class),
  // Cron バッチ取得（active かつ未記録）。
  index('entries_cron_idx').on(table.isCompleted, table.isBanned, table.lastSnapshotAt),
]);

export const snapshots = pgTable('snapshots', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull(),
  followersCount: integer('followers_count').notNull(),
  capturedAt: timestamp('captured_at').notNull(),
}, (table) => [
  // entryId での絞り込み + capturedAt 順の取得が頻発する。
  index('snapshots_entry_captured_idx').on(table.entryId, table.capturedAt),
]);

export const oauthStates = pgTable('oauth_states', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull(),
});

export const oauthSessions = pgTable('oauth_sessions', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const champions = pgTable('champions', {
  id: serial('id').primaryKey(),
  season: integer('season').notNull(),
  class: text('class').notNull(),
  entryId: integer('entry_id').notNull(),
  totalGain: integer('total_gain').notNull(),
  decidedAt: timestamp('decided_at').notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Entry = InferSelectModel<typeof entries>;
export type Snapshot = InferSelectModel<typeof snapshots>;

// ─── DB Client (lazy init) ────────────────────────────────────────────────────

type DbClient = ReturnType<typeof drizzle>;

let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _db = drizzle(neon(process.env.DATABASE_URL));
  }
  return _db;
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    // メソッドは実 DB インスタンスに束縛して返す（this が Proxy になる事故を防ぐ）。
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
