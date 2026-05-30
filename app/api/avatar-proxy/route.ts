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

    // 画像以外（HTML 等）をプロキシしない
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 415 });
    }

    // サイズ上限 5MB（アバター画像としては十分。巨大レスポンスでのメモリ枯渇対策）
    const MAX_BYTES = 5 * 1024 * 1024;
    const declared = Number(upstream.headers.get('content-length') ?? '');
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      return new NextResponse('Image too large', { status: 413 });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_BYTES) {
      return new NextResponse('Image too large', { status: 413 });
    }

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
