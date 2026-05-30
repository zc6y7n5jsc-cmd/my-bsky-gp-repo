import { NextRequest, NextResponse } from 'next/server';
import { getSessionDid, clearSession } from '@/src/lib/session';
import { deleteUserData } from '@/src/lib/player';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const did = await getSessionDid();
  if (!did) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = checkRateLimit(req, { name: 'user-delete', limit: 5, windowMs: 60_000, key: did });
  if (limited) return limited;

  await deleteUserData(did);
  await clearSession();

  return NextResponse.json({ ok: true });
}
