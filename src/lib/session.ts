import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'bskygp_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return secret;
}

function sign(value: string): string {
  const sig = createHmac('sha256', getSecret()).update(value).digest('base64url');
  return `${value}.${sig}`;
}

/** HMAC を検証して署名付きペイロードを返す（不正なら null） */
function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = Buffer.from(signed.slice(idx + 1));
  const expected = Buffer.from(
    createHmac('sha256', getSecret()).update(value).digest('base64url'),
  );
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(sig, expected)) return null;
  } catch {
    return null;
  }
  return value;
}

export async function getSessionDid(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  const payload = unsign(cookie.value);
  if (!payload) return null;

  // ペイロード形式: `<did>|<expiryEpochSeconds>`
  // 旧形式（DID のみ・期限なし）は失効扱いにして再ログインを促す。
  const sep = payload.lastIndexOf('|');
  if (sep === -1) return null;

  const did = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!did || !Number.isFinite(exp)) return null;
  if (Date.now() / 1000 >= exp) return null; // 期限切れ

  return did;
}

export async function setSessionDid(did: string): Promise<void> {
  const store = await cookies();
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  store.set(COOKIE_NAME, sign(`${did}|${exp}`), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
