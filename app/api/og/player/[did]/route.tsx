import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { getLatestEntryForDid } from '@/src/lib/player';
import { getRankAroundUser } from '@/src/lib/rankings';

export const runtime = 'nodejs';

const CLASS_COLORS: Record<string, string> = {
  Rookie:      '#94a3b8',
  Rising:      '#34d399',
  Challenger:  '#38bdf8',
  Established: '#a78bfa',
  Influencer:  '#fbbf24',
  Star:        '#fb7185',
};

// satori requires all elements to have explicit display: flex (default is block, not flex)
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const row: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ did: string }> },
) {
  try {
    const { did } = await params;
    const decoded = decodeURIComponent(did);

    const [entry, rankData] = await Promise.all([
      getLatestEntryForDid(decoded).catch(() => null),
      getRankAroundUser(decoded, 'all', 'daily').catch(() => ({ myRank: null, around: [] })),
    ]);

    const name = entry?.displayName || (entry ? `@${entry.handle}` : 'Player');
    const handle = entry ? `@${entry.handle}` : '';
    const cls = entry?.class ?? 'Rookie';
    const clsColor = CLASS_COLORS[cls] ?? '#94a3b8';
    const gain = entry?.maxMonthlyGain ?? 0;
    const rank = rankData.myRank?.rank ?? null;
    const avatar = entry?.avatar ?? null;

    return new ImageResponse(
      (
        <div
          style={{
            ...row,
            width: '1200px',
            height: '630px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2744 100%)',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Left: Profile */}
          <div
            style={{
              ...col,
              justifyContent: 'center',
              paddingLeft: '72px',
              flex: 1,
              gap: '16px',
            }}
          >
            {/* Avatar */}
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                width={120}
                height={120}
                style={{
                  borderRadius: '50%',
                  border: '3px solid rgba(56,189,248,0.4)',
                }}
                alt=""
              />
            ) : (
              <div
                style={{
                  ...row,
                  justifyContent: 'center',
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: '#1e40af', fontSize: '48px', color: 'white',
                }}
              >
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            {/* Name */}
            <div style={{ display: 'flex', color: 'white', fontSize: '36px', fontWeight: '800', maxWidth: '480px' }}>
              {name}
            </div>
            <div style={{ display: 'flex', color: '#64748b', fontSize: '22px' }}>
              {handle}
            </div>

            {/* Class badge */}
            <div
              style={{
                ...row,
                gap: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${clsColor}44`,
                borderRadius: '100px',
                padding: '8px 20px',
              }}
            >
              <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', background: clsColor }} />
              <span style={{ display: 'flex', color: clsColor, fontSize: '20px', fontWeight: '700', marginLeft: '8px' }}>{cls}</span>
            </div>
          </div>

          {/* Right: Stats */}
          <div
            style={{
              ...col,
              justifyContent: 'center',
              paddingRight: '72px',
              gap: '20px',
              width: '380px',
            }}
          >
            {/* Rank box */}
            <div
              style={{
                ...col,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '28px 36px',
              }}
            >
              <div style={{ display: 'flex', color: '#64748b', fontSize: '13px', marginBottom: '8px', letterSpacing: '2px' }}>
                TOTAL RANK
              </div>
              <div style={{ display: 'flex', color: '#fbbf24', fontSize: '60px', fontWeight: '900', lineHeight: '1' }}>
                {rank != null ? `#${rank}` : '--'}
              </div>
            </div>

            {/* Gain box */}
            <div
              style={{
                ...col,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '28px 36px',
              }}
            >
              <div style={{ display: 'flex', color: '#64748b', fontSize: '13px', marginBottom: '8px', letterSpacing: '2px' }}>
                MONTHLY GAIN
              </div>
              <div style={{ display: 'flex', color: '#4ade80', fontSize: '52px', fontWeight: '900', lineHeight: '1' }}>
                +{gain.toLocaleString()}
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', color: '#475569', fontSize: '18px', fontWeight: '600' }}>
              {entry ? (entry.isCompleted ? '🏁 挑戦完了' : '🔥 参戦中') : '--'}
            </div>
          </div>

          {/* Bottom branding */}
          <div
            style={{
              ...row,
              justifyContent: 'space-between',
              position: 'absolute',
              bottom: '28px',
              left: '72px',
              right: '72px',
            }}
          >
            <div style={{ ...row, gap: '8px' }}>
              <span style={{ display: 'flex', color: '#38bdf8', fontSize: '22px', fontWeight: '900' }}>BSKY-GP</span>
              <span style={{ display: 'flex', color: '#475569', fontSize: '14px', marginLeft: '8px' }}>Bluesky Grand Prix</span>
            </div>
            <span style={{ display: 'flex', color: '#334155', fontSize: '14px' }}>30日間フォロワー成長チャレンジ</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    console.error('[og/player] error:', err);
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '1200px', height: '630px',
            background: '#0f172a', color: '#38bdf8',
            fontSize: '64px', fontWeight: '900', fontFamily: 'sans-serif',
          }}
        >
          BSKY-GP
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
