import { NextRequest, NextResponse } from 'next/server';
import { getTop3ChartData, isValidPeriod, isValidClass } from '@/src/lib/rankings';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, { name: 'rankings-chart', limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const classParam = searchParams.get('class') ?? 'all';
  const periodParam = searchParams.get('period') ?? 'daily';

  if (!isValidClass(classParam)) {
    return NextResponse.json({ error: `Invalid class: ${classParam}` }, { status: 400 });
  }
  if (!isValidPeriod(periodParam)) {
    return NextResponse.json({ error: `Invalid period: ${periodParam}` }, { status: 400 });
  }

  const data = await getTop3ChartData(classParam, periodParam);
  return NextResponse.json({ entries: data });
}
