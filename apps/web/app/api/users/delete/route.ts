import { NextResponse } from 'next/server';
import { getSessionDid, clearSession } from '@/src/lib/session';
import { deleteUserData } from '@/src/lib/player';

export const runtime = 'nodejs';

export async function POST() {
  const did = await getSessionDid();
  if (!did) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteUserData(did);
  await clearSession();

  return NextResponse.json({ ok: true });
}
