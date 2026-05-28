import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { entries, db } from '@/src/lib/db-schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

function verifyAdminAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const flagged = await db
      .select()
      .from(entries)
      .where(eq(entries.isFlagged, true))
      .orderBy(desc(entries.lastSnapshotAt));

    return NextResponse.json({ entries: flagged, total: flagged.length });
  } catch (err) {
    console.error('[admin/flagged] DB error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
