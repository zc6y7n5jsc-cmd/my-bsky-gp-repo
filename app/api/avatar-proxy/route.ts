import { NextRequest, NextResponse } from 'next/server';

// 許可するホストのみプロキシ（SSRF対策）
const ALLOWED_HOSTS = ['cdn.bsky.app', 'av-cdn.bsky.app'];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse('Host not allowed', { status: 403 });
  }

  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only https allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'BSKY-GP/1.0' },
      next: { revalidate: 3600 },
    } as RequestInit);

    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch avatar', { status: 502 });
  }
}
