import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 挑戦エントリー
export const entries = pgTable(
  'entries',
  {
    id: serial('id').primaryKey(),
    did: text('did').notNull(),
    handle: text('handle').notNull(),
    displayName: text('display_name'),
    avatar: text('avatar'),
    class: text('class').notNull(), // Rookie / Rising / Challenger / Established / Influencer / Star
    baselineFollowers: integer('baseline_followers').notNull(),
    season: integer('season').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    isFlagged: boolean('is_flagged').notNull().default(false),
    isBanned: boolean('is_banned').notNull().default(false),
    lastSnapshotAt: timestamp('last_snapshot_at', { withTimezone: true }),
    // 集計キャッシュ（スナップショット保存時に同時 UPDATE）
    currentFollowers: integer('current_followers'),
    maxDailyGain: integer('max_daily_gain').default(0),
    maxWeeklyGain: integer('max_weekly_gain').default(0),
    maxMonthlyGain: integer('max_monthly_gain').default(0),
  },
  (table) => [
    // 進行中エントリーは 1 DID につき 1 つのみ（部分ユニーク制約）
    uniqueIndex('entries_did_active_idx')
      .on(table.did)
      .where(sql`is_completed = false`),
    index('entries_class_idx').on(table.class),
    index('entries_season_idx').on(table.season),
    index('entries_is_completed_idx').on(table.isCompleted),
  ],
);

// フォロワー数の時系列記録
export const snapshots = pgTable(
  'snapshots',
  {
    id: serial('id').primaryKey(),
    entryId: integer('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    followersCount: integer('followers_count').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_snapshots_entry').on(table.entryId, table.capturedAt),
  ],
);

// 殿堂 / 年間王者
export const champions = pgTable('champions', {
  id: serial('id').primaryKey(),
  season: integer('season').notNull(),
  class: text('class').notNull(),
  entryId: integer('entry_id')
    .notNull()
    .references(() => entries.id),
  totalGain: integer('total_gain').notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull(),
});

// OAuth セッションストア（@atproto/oauth-client-node 用）
export const oauthSessions = pgTable('oauth_sessions', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// OAuth ステートストア（PKCE / DPoP nonce 用）
export const oauthStates = pgTable('oauth_states', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
export type Champion = typeof champions.$inferSelect;
