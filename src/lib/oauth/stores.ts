import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { oauthStates, oauthSessions } from '../db-schema';
import type {
  NodeSavedState,
  NodeSavedStateStore,
  NodeSavedSession,
  NodeSavedSessionStore,
} from '@atproto/oauth-client-node';

// OAuth state の TTL: 10分（PKCE フロー完了まで）
const STATE_TTL_MS = 10 * 60 * 1000;

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql);
}

export function createNeonStateStore(): NodeSavedStateStore {
  return {
    async get(key) {
      const db = getDb();
      const rows = await db
        .select()
        .from(oauthStates)
        .where(eq(oauthStates.key, key))
        .limit(1);
      if (!rows.length) return undefined;
      const row = rows[0];
      if (row.expiresAt && row.expiresAt < new Date()) {
        await db.delete(oauthStates).where(eq(oauthStates.key, key));
        return undefined;
      }
      return JSON.parse(row.value) as NodeSavedState;
    },

    async set(key, value) {
      const db = getDb();
      const serialized = JSON.stringify(value);
      const expiresAt = new Date(Date.now() + STATE_TTL_MS);
      await db
        .insert(oauthStates)
        .values({ key, value: serialized, expiresAt, createdAt: new Date() })
        .onConflictDoUpdate({
          target: oauthStates.key,
          set: { value: serialized, expiresAt },
        });
    },

    async del(key) {
      const db = getDb();
      await db.delete(oauthStates).where(eq(oauthStates.key, key));
    },
  };
}

export function createNeonSessionStore(): NodeSavedSessionStore {
  return {
    async get(key) {
      const db = getDb();
      const rows = await db
        .select()
        .from(oauthSessions)
        .where(eq(oauthSessions.key, key))
        .limit(1);
      if (!rows.length) return undefined;
      return JSON.parse(rows[0].value) as NodeSavedSession;
    },

    async set(key, value) {
      const db = getDb();
      const serialized = JSON.stringify(value);
      const now = new Date();
      await db
        .insert(oauthSessions)
        .values({ key, value: serialized, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: oauthSessions.key,
          set: { value: serialized, updatedAt: now },
        });
    },

    async del(key) {
      const db = getDb();
      await db.delete(oauthSessions).where(eq(oauthSessions.key, key));
    },
  };
}
