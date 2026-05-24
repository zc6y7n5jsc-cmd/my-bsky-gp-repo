import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: 'error', message: 'DATABASE_URL not set' }, { status: 503 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT 1 AS ok`;
    return NextResponse.json({
      status: 'ok',
      db: result[0]?.ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 503 },
    );
  }
}
