import { NextRequest, NextResponse } from 'next/server';
import { getSessionDid } from '@/src/lib/session';
import { getActiveEntry } from '@/src/lib/entries';
import { fetchBlueskyProfile } from '@/src/lib/bluesky';
import {
  isNotRecordedToday,
  recordSnapshot,
  getRecentSnapshots,
} from '@/src/lib/snapshot';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ did: string }> },
) {
  // 1. 認証チェック
  const sessionDid = await getSessionDid();
  if (!sessionDid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = checkRateLimit(req, { name: 'sync', limit: 30, windowMs: 60_000, key: sessionDid });
  if (limited) return limited;

  // 2. URL パラメーターの DID がセッション DID と一致するか確認
  //    （自分のデータのみ同期可能）
  const { did } = await params;
  const decodedDid = decodeURIComponent(did);

  if (sessionDid !== decodedDid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. アクティブエントリーの存在確認
  const entry = await getActiveEntry(decodedDid);
  if (!entry) {
    return NextResponse.json({ error: 'No active entry' }, { status: 404 });
  }

  // 4. 当日未記録かチェック（Vercel 関数呼び出し節約のためのガード）
  const needsSync = isNotRecordedToday(entry.lastSnapshotAt);

  if (!needsSync) {
    // 今日は既に記録済み → 直近スナップショットだけ返す
    const recentSnaps = await getRecentSnapshots(entry.id, 30);
    return NextResponse.json({
      synced: false,
      message: 'Already recorded today',
      entry: {
        id: entry.id,
        class: entry.class,
        currentFollowers: entry.currentFollowers,
        maxDailyGain: entry.maxDailyGain,
        maxWeeklyGain: entry.maxWeeklyGain,
        maxMonthlyGain: entry.maxMonthlyGain,
        lastSnapshotAt: entry.lastSnapshotAt,
        endsAt: entry.endsAt,
      },
      snapshots: recentSnaps,
    });
  }

  // 5. Bluesky API から最新フォロワー数を取得（ハンドル変更対策含む）
  const profile = await fetchBlueskyProfile(decodedDid, { fresh: true, withRetry: true });
  if (!profile) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 502 });
  }

  const followersCount = profile.followersCount ?? 0;

  // 6. スナップショット記録 + 集計キャッシュ更新
  const { gains, isCompleted } = await recordSnapshot(entry, profile, followersCount);

  // 7. 直近 30 件のスナップショットを返す
  const recentSnaps = await getRecentSnapshots(entry.id, 30);

  return NextResponse.json({
    synced: true,
    followersCount,
    gains,
    isCompleted,
    entry: {
      id: entry.id,
      class: entry.class,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
      currentFollowers: followersCount,
      maxDailyGain: Math.max(gains.dailyGain, entry.maxDailyGain ?? 0),
      maxWeeklyGain: Math.max(gains.weeklyGain, entry.maxWeeklyGain ?? 0),
      maxMonthlyGain: Math.max(gains.monthlyGain, entry.maxMonthlyGain ?? 0),
      lastSnapshotAt: new Date(),
      endsAt: entry.endsAt,
    },
    snapshots: recentSnaps,
  });
}
