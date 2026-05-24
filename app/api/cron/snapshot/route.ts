import { NextRequest, NextResponse } from 'next/server';
import { fetchBlueskyProfile } from '@/src/lib/bluesky';
import { getUnrecordedActiveEntries, recordSnapshot } from '@/src/lib/snapshot';
import { CRON_BATCH_SIZE } from '@/src/lib/constants';

export const runtime = 'nodejs';
// Vercel Fluid compute: I/O 待ち時間は CPU 時間に計上されないため
// 50 ユーザー × (Bluesky API + DB) でも関数タイムアウトしない
export const maxDuration = 300; // 5 分（Vercel Pro では最大 900 秒）

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  // CRON_SECRET 未設定なら開発環境として認証スキップ
  if (!cronSecret) return true;

  // Vercel Cron は Authorization: Bearer <CRON_SECRET> を自動付与する
  const auth = req.headers.get('Authorization');
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    completed: 0, // 30日終了として完了処理したエントリー数
    errors: [] as string[],
  };

  // バッチ取得（当日未記録のアクティブエントリー、上限 CRON_BATCH_SIZE 件）
  let batch;
  try {
    batch = await getUnrecordedActiveEntries(CRON_BATCH_SIZE);
  } catch (err) {
    console.error('[cron/snapshot] DB fetch error:', err);
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 });
  }

  if (batch.length === 0) {
    return NextResponse.json({ ...results, message: 'No entries to process' });
  }

  // ─── ユーザーごとにスナップショット記録 ───────────────────────────────────
  for (const entry of batch) {
    results.processed++;

    // Bluesky API: Exponential Backoff 付き、キャッシュなし
    const profile = await fetchBlueskyProfile(entry.did, { fresh: true, withRetry: true });

    if (!profile) {
      // 取得失敗 → last_snapshot_at を更新しない（次回 Cron で再挑戦）
      results.failed++;
      results.errors.push(`[${entry.did}] profile fetch failed`);
      continue;
    }

    const followersCount = profile.followersCount ?? 0;

    try {
      const { isCompleted } = await recordSnapshot(entry, profile, followersCount);
      results.succeeded++;
      if (isCompleted) results.completed++;
    } catch (err) {
      results.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`[${entry.did}] DB error: ${msg}`);
      console.error(`[cron/snapshot] DB error for ${entry.did}:`, err);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[cron/snapshot] done in ${durationMs}ms | processed=${results.processed} succeeded=${results.succeeded} failed=${results.failed}`,
  );

  return NextResponse.json({ ...results, durationMs });
}

// 外部 Cron サービス（cron-job.org 等）からの POST も受け付ける
export { GET as POST };
