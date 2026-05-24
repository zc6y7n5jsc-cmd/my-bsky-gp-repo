import { NextRequest, NextResponse } from 'next/server';
import { getSessionDid, clearSession } from '@/src/lib/session';
import { createOAuthClient } from '@/src/lib/oauth/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const did = await getSessionDid();

  if (did) {
    try {
      // OAuth トークンを revoke（ベストエフォート）
      const client = createOAuthClient();
      await client.revoke(did);
    } catch (err) {
      // revoke 失敗はログのみ（セッション削除は必ず行う）
      console.warn('[auth/logout] revoke failed:', err);
    }
  }

  await clearSession();

  return NextResponse.redirect(new URL('/', req.url));
}

// フォーム送信（GET）でもログアウトできるようにする
export async function GET(req: NextRequest) {
  return POST(req);
}
