import { NextResponse } from 'next/server';
import { SITE_URL } from '@/src/lib/constants';

export const runtime = 'nodejs';
// キャッシュなし（環境変数が変わっても即反映）
export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = SITE_URL;

  const metadata = {
    client_id: `${siteUrl}/client-metadata.json`,
    client_name: 'BSKY-GP — Bluesky Grand Prix',
    client_uri: siteUrl,
    redirect_uris: [`${siteUrl}/api/auth/callback`],
    scope: 'atproto',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
  };

  return NextResponse.json(metadata, {
    headers: {
      // AT Protocol の仕様に従い Access-Control-Allow-Origin を設定
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
