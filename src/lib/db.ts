import { createDb } from '@bsky-gp/db/client';
import type { DbClient } from '@bsky-gp/db/client';

// 遅延初期化：モジュール評価時ではなく実際のクエリ実行時に接続を確立する。
// これにより DATABASE_URL がない環境（ビルド時など）でもモジュールインポートが通る。
let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _db = createDb(process.env.DATABASE_URL);
  }
  return _db;
}

// entries.ts など既存コードとの互換性のため Proxy で db としても公開
export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
