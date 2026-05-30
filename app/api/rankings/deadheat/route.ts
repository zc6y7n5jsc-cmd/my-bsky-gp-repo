import { NextRequest, NextResponse } from 'next/server';
import { getDeadHeat, isValidPeriod, isValidClass } from '@/src/lib/rankings';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, { name: 'rankings-deadheat', limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const classParam = searchParams.get('class') ?? 'all';
  const periodParam = searchParams.get('period') ?? 'daily';

  if (!isValidClass(classParam)) {
    return NextResponse.json({ error: 'Invalid class parameter' }, { status: 400 });
  }
  if (!isValidPeriod(periodParam)) {
    return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
  }

  const result = await getDeadHeat(classParam, periodParam);
  return NextResponse.json(result ?? null);
}
