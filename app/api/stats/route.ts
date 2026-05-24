import { NextResponse } from 'next/server';
import { getParticipantCount } from '@/src/lib/rankings';

export const runtime = 'nodejs';

export async function GET() {
  const count = await getParticipantCount();
  return NextResponse.json({ participantCount: count });
}
