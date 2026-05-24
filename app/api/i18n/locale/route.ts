import { NextRequest, NextResponse } from 'next/server';
import { locales, LOCALE_COOKIE } from '@/src/i18n/request';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const locale = (body as Record<string, unknown>)?.locale;
  if (typeof locale !== 'string' || !(locales as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    httpOnly: false, // needs to be readable client-side for display
  });
  return res;
}
