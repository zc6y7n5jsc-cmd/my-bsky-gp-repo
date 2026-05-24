import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// HTTP ドライバーを使う（WebSocket 接続は使わない）
// Vercel Serverless / Cloudflare Workers 両方で動作し、
// Neon 無料プランのコネクション上限を回避できる
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
