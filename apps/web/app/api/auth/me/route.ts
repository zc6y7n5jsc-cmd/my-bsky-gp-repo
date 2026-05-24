import { NextResponse } from 'next/server';
import { getSessionDid } from '@/src/lib/session';
import { fetchBlueskyProfile } from '@/src/lib/bluesky';

export const runtime = 'nodejs';

export async function GET() {
  const did = await getSessionDid();
  if (!did) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // DID をもとに Bluesky 公開 API からプロフィールを取得
  // ハンドル変更対応: 毎回 API から最新値を取得する
  const profile = await fetchBlueskyProfile(did);
  if (!profile) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 502 });
  }

  return NextResponse.json({
    did: profile.did,
    handle: profile.handle,
    displayName: profile.displayName ?? profile.handle,
    avatar: profile.avatar,
    followersCount: profile.followersCount ?? 0,
  });
}
