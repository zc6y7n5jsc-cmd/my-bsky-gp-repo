import { ImageResponse } from '@vercel/og';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/src/lib/rate-limit';
import { readFile } from 'fs/promises';
import path from 'path';
import { getSessionDid } from '@/src/lib/session';
import { getActiveEntry } from '@/src/lib/entries';
import { getSnapshotsAsc } from '@/src/lib/player';
import { getRankAroundUser } from '@/src/lib/rankings';
import type { RankingClass } from '@/src/lib/rankings';
import { LicenseCard, CARD_W, CARD_H, CARD_FONT } from '@/src/lib/license-card';

export const runtime = 'nodejs';

// 外部画像を base64 data URL に変換（CORS・CDN エラーを回避）
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn('[profile-card] avatar fetch not ok:', res.status, url);
      return null;
    }
    const buf  = await res.arrayBuffer();
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch (err) {
    console.warn('[profile-card] avatar fetch failed:', err);
    return null;
  }
}

// public/fonts/ のフォントをファイルシステムから読み込む（本番でも確実）
async function loadFonts(): Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[]> {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontsDir, 'OpenSans-Regular.ttf')),
    readFile(path.join(fontsDir, 'OpenSans-SemiBold.ttf')),
  ]);
  // Buffer.buffer は内部プールを指すことがあるので byteOffset/length で正確に切り出す
  const toAB = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  return [
    { name: CARD_FONT, data: toAB(regular), weight: 400, style: 'normal' },
    { name: CARD_FONT, data: toAB(bold),    weight: 700, style: 'normal' },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const did = await getSessionDid();
    if (!did) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 画像生成は重いので DID 単位で制限
    const limited = checkRateLimit(req, { name: 'card-download', limit: 20, windowMs: 60_000, key: did });
    if (limited) return limited;

    const entry = await getActiveEntry(did).catch(() => null);

    const [overallRankData, classRankData, snapshots, fonts] = await Promise.all([
      getRankAroundUser(did, 'all', 'daily').catch(() => ({ myRank: null, around: [] })),
      entry
        ? getRankAroundUser(did, entry.class as RankingClass, 'daily').catch(() => ({ myRank: null, around: [] }))
        : Promise.resolve({ myRank: null, around: [] }),
      entry ? getSnapshotsAsc(entry.id, 30).catch(() => []) : Promise.resolve([]),
      loadFonts().catch((err) => {
        console.error('[profile-card] font load failed:', err);
        return [];
      }),
    ]);

    // アバター画像を data URL に変換（失敗時は null → イニシャルで代替）
    const avatarDataUrl = entry?.avatar ? await toDataUrl(entry.avatar) : null;

    const imageResponse = new ImageResponse(
      LicenseCard({
        did,
        name:        entry?.displayName || (entry ? `@${entry.handle}` : 'Player'),
        handle:      entry ? `@${entry.handle}` : '',
        cls:         entry?.class ?? 'Rookie',
        gain:        entry?.maxMonthlyGain ?? 0,
        overallRank: overallRankData.myRank?.rank ?? null,
        classRank:   classRankData.myRank?.rank ?? null,
        season:      entry?.season ?? 1,
        startedAt:   entry?.startedAt ?? null,
        endsAt:      entry?.endsAt ?? null,
        isCompleted: entry?.isCompleted ?? false,
        registered:  !!entry,
        baseline:    entry?.baselineFollowers ?? 0,
        snapshots,
        avatarDataUrl,
      }),
      {
        width: CARD_W,
        height: CARD_H,
        fonts: fonts.length > 0 ? fonts : undefined,
      },
    );

    const imageBuffer = await imageResponse.arrayBuffer();
    const safeHandle  = (entry?.handle ?? did).replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="bsky-gp-${safeHandle}.png"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[profile-card/download] error:', err);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
