-- BSKY-GP インデックス定義（既存 DB にも安全に適用できるよう IF NOT EXISTS）
--
-- 適用方法（例）:
--   psql "$DATABASE_URL" -f drizzle/0000_indexes.sql
--
-- 注意: entries_did_active_idx は「進行中エントリーは 1 DID 1 件」を強制する
-- 部分ユニークインデックス。既存データに重複 active 行があると作成に失敗するため、
-- 事前に重複を解消しておくこと（下の確認クエリ参照）。

-- 重複 active 行の確認:
--   SELECT did, count(*) FROM entries WHERE is_completed = false GROUP BY did HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS entries_did_active_idx
  ON entries (did) WHERE is_completed = false;

CREATE INDEX IF NOT EXISTS entries_did_idx          ON entries (did);
CREATE INDEX IF NOT EXISTS entries_daily_rank_idx   ON entries (max_daily_gain, handle);
CREATE INDEX IF NOT EXISTS entries_weekly_rank_idx  ON entries (max_weekly_gain, handle);
CREATE INDEX IF NOT EXISTS entries_monthly_rank_idx ON entries (max_monthly_gain, handle);
CREATE INDEX IF NOT EXISTS entries_class_idx        ON entries (class);
CREATE INDEX IF NOT EXISTS entries_cron_idx         ON entries (is_completed, is_banned, last_snapshot_at);

CREATE INDEX IF NOT EXISTS snapshots_entry_captured_idx ON snapshots (entry_id, captured_at);
