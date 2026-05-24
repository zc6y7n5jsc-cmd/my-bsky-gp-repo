import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { createNeonStateStore, createNeonSessionStore } from './stores';
import { SITE_URL, IS_LOCAL } from '../constants';

const CLIENT_ID = `${SITE_URL}/client-metadata.json`;
const REDIRECT_URI = `${SITE_URL}/api/auth/callback`;

// サーバーサイドでリクエストごとに生成（serverless 対応）
export function createOAuthClient(): NodeOAuthClient {
  return new NodeOAuthClient({
    clientMetadata: {
      client_id: CLIENT_ID as `https://${string}`,
      client_name: 'BSKY-GP — Bluesky Grand Prix',
      client_uri: SITE_URL as `https://${string}`,
      redirect_uris: [REDIRECT_URI as `https://${string}`],
      scope: 'atproto',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true,
    },
    // Bluesky のハンドルリゾルバー
    handleResolver: 'https://bsky.social',
    stateStore: createNeonStateStore(),
    sessionStore: createNeonSessionStore(),
    responseMode: 'query',
    // ローカル開発では HTTP を許可（本番では不使用）
    allowHttp: IS_LOCAL,
  });
}
