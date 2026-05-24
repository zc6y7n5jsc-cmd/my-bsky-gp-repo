import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { entries, db } from '@/src/lib/db-schema';

export const runtime = 'nodejs';

function verifyAdminAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get('Authorization') === `Bearer ${secret}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId)) {
    return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(entries)
      .set({ isBanned: true })
      .where(eq(entries.id, entryId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    console.log(`[admin/ban] entry ${entryId} (${updated.did}) banned`);
    return NextResponse.json({ entry: updated });
  } catch (err) {
    console.error('[admin/ban] DB error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
