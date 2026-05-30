import { NextRequest, NextResponse } from 'next/server';
import { getSessionDid } from '@/src/lib/session';
import { fetchBlueskyProfile } from '@/src/lib/bluesky';
import { getActiveEntry, registerEntry } from '@/src/lib/entries';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1. 認証チェック
  const did = await getSessionDid();
  if (!did) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 参加登録は Bluesky API を叩くので DID 単位で制限
  const limited = checkRateLimit(req, { name: 'register', limit: 10, windowMs: 60_000, key: did });
  if (limited) return limited;

  // 2. 既に参加中かチェック（DB 一意制約の前に先読みして 409 を返す）
  const existing = await getActiveEntry(did);
  if (existing) {
    return NextResponse.json(
      {
        error: 'Already participating',
        entry_id: existing.id,
        class: existing.class,
        baseline_followers: existing.baselineFollowers,
        started_at: existing.startedAt,
        ends_at: existing.endsAt,
      },
      { status: 409 },
    );
  }

  // 3. Bluesky API からフォロワー数を取得（fresh = キャッシュなし、ハンドル変更対策も兼ねる）
  const profile = await fetchBlueskyProfile(did, { fresh: true });
  if (!profile) {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 502 },
    );
  }

  // 4. entries + snapshot を DB に登録
  try {
    const entry = await registerEntry(did, profile);

    return NextResponse.json(
      {
        entry_id: entry.id,
        class: entry.class,
        baseline_followers: entry.baselineFollowers,
        started_at: entry.startedAt,
        ends_at: entry.endsAt,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    // DB の一意制約違反（同時リクエストによる競合）
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('entries_did_active_idx') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Already participating' }, { status: 409 });
    }
    console.error('[entries/register] DB error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
