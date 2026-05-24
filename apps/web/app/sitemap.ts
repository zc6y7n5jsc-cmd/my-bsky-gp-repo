import type { MetadataRoute } from 'next';
import { db } from '@/src/lib/db';
import { entries } from '@bsky-gp/db/schema';
import { eq, and } from 'drizzle-orm';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bsky-gp.vercel.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/rankings`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/hall-of-fame`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 参加者のプロフィールページ（ban されていない DID のみ、重複除去済み）
  let playerPages: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .selectDistinct({
        did: entries.did,
        lastSnapshotAt: entries.lastSnapshotAt,
      })
      .from(entries)
      .where(and(eq(entries.isBanned, false)))
      .limit(1000);

    playerPages = rows.map((row) => ({
      url: `${SITE_URL}/player/${encodeURIComponent(row.did)}`,
      lastModified: row.lastSnapshotAt ?? now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));
  } catch {
    // DB 接続失敗時は静的ページのみ返す
  }

  return [...staticPages, ...playerPages];
}
