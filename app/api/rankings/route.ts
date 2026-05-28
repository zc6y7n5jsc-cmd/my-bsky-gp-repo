import { NextRequest, NextResponse } from 'next/server';
import { getRankings, isValidPeriod, isValidClass } from '@/src/lib/rankings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const classParam = searchParams.get('class') ?? 'all';
  const periodParam = searchParams.get('period') ?? 'daily';
  const pageParam = searchParams.get('page') ?? '1';

  if (!isValidClass(classParam)) {
    return NextResponse.json({ error: 'Invalid class parameter' }, { status: 400 });
  }
  if (!isValidPeriod(periodParam)) {
    return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
  }

  const page = Math.max(1, parseInt(pageParam, 10) || 1);

  const result = await getRankings(classParam, periodParam, page);

  return NextResponse.json(result);
}
