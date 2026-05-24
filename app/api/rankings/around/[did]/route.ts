import { NextRequest, NextResponse } from 'next/server';
import { getSessionDid } from '@/src/lib/session';
import { getRankAroundUser, isValidPeriod, isValidClass } from '@/src/lib/rankings';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ did: string }> },
) {
  const sessionDid = await getSessionDid();
  if (!sessionDid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { did } = await params;
  const decodedDid = decodeURIComponent(did);

  if (sessionDid !== decodedDid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const classParam = searchParams.get('class') ?? 'all';
  const periodParam = searchParams.get('period') ?? 'daily';

  if (!isValidClass(classParam)) {
    return NextResponse.json(
      { error: `Invalid class: ${classParam}` },
      { status: 400 },
    );
  }
  if (!isValidPeriod(periodParam)) {
    return NextResponse.json(
      { error: `Invalid period: ${periodParam}` },
      { status: 400 },
    );
  }

  const result = await getRankAroundUser(decodedDid, classParam, periodParam);

  return NextResponse.json(result);
}
