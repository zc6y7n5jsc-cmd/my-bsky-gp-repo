import { NextRequest, NextResponse } from 'next/server';
import { createOAuthClient } from '@/src/lib/oauth/client';
import { setSessionDid } from '@/src/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // エラーレスポンスの処理（ユーザーがキャンセルした等）
  const error = params.get('error');
  if (error) {
    const desc = params.get('error_description') ?? error;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(desc)}`, req.url),
    );
  }

  try {
    const client = createOAuthClient();
    const { session } = await client.callback(params);

    // session.sub は DID（AT Protocol の不変識別子）
    const did = session.sub;
    await setSessionDid(did);

    // ログイン成功 → ホームへ（将来は参加登録ページへ誘導）
    return NextResponse.redirect(new URL('/', req.url));
  } catch (err) {
    console.error('[auth/callback] callback error:', err);
    const msg = err instanceof Error ? err.message : 'OAuth コールバック処理に失敗しました';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
