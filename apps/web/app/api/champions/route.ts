import { NextRequest, NextResponse } from 'next/server';
import { getChampions, getAvailableSeasons } from '@/src/lib/champions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get('season');

  try {
    const seasons = await getAvailableSeasons();

    let season: number;
    if (seasonParam) {
      season = parseInt(seasonParam, 10);
      if (isNaN(season) || season < 1) {
        return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
      }
    } else {
      season = seasons[0] ?? 1;
    }

    const champions = await getChampions(season);
    return NextResponse.json({ season, seasons, champions });
  } catch (err) {
    console.error('[GET /api/champions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
