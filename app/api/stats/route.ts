import { NextRequest, NextResponse } from 'next/server';
import { getParticipantCount } from '@/src/lib/rankings';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, { name: 'stats', limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const count = await getParticipantCount();
  return NextResponse.json({ participantCount: count });
}
