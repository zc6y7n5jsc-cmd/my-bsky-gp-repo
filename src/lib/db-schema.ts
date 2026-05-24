import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';
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
});

export const snapshots = pgTable('snapshots', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull(),
  followersCount: integer('followers_count').notNull(),
  capturedAt: timestamp('captured_at').notNull(),
});

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
    return Reflect.get(getDb(), prop);
  },
});
