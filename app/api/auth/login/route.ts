import { NextRequest, NextResponse } from 'next/server';
import { createOAuthClient } from '@/src/lib/oauth/client';
import { getSessionDid } from '@/src/lib/session';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, { name: 'auth-login', limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  // すでにログイン済みならホームへ
  const existingDid = await getSessionDid();
  if (existingDid) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const handle = req.nextUrl.searchParams.get('handle')?.trim();
  if (!handle) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('ハンドルを入力してください')}`, req.url),
    );
  }

  // 基本的なハンドル形式チェック（サーバー側バリデーション）
  const cleanHandle = handle.replace(/^@/, '');
  if (!cleanHandle || cleanHandle.length > 253 || /\s/.test(cleanHandle)) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('無効なハンドルです')}`, req.url),
    );
  }

  try {
    const client = createOAuthClient();
    const authUrl = await client.authorize(cleanHandle, {
      scope: 'atproto',
    });
    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    console.error('[auth/login] authorize error:', err);
    const msg = err instanceof Error ? err.message : 'OAuth 認証の開始に失敗しました';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
