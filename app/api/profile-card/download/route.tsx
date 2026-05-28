import { ImageResponse } from '@vercel/og';
import { NextResponse } from 'next/server';
import { getSessionDid } from '@/src/lib/session';
import { getActiveEntry } from '@/src/lib/entries';
import { getSnapshotsAsc } from '@/src/lib/player';
import { getRankAroundUser } from '@/src/lib/rankings';
import type { RankingClass } from '@/src/lib/rankings';

export const runtime = 'nodejs';

const CLASS_COLORS: Record<string, string> = {
  Rookie:      '#94a3b8',
  Rising:      '#34d399',
  Challenger:  '#38bdf8',
  Established: '#a78bfa',
  Influencer:  '#fbbf24',
  Star:        '#fb7185',
};

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const row: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' };

function buildChartPoints(
  snaps: Array<{ followersCount: number }>,
  baseline: number,
  w: number,
  h: number,
): string {
  if (snaps.length < 2) return '';
  const gains = snaps.map((s) => s.followersCount - baseline);
  const minG = Math.min(0, ...gains);
  const maxG = Math.max(...gains, 1);
  const range = maxG - minG || 1;
  return snaps
    .map((s, i) => {
      const x = ((i / (snaps.length - 1)) * w).toFixed(1);
      const gain = s.followersCount - baseline;
      const y = (h - ((gain - minG) / range) * (h - 6)).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');
}

function buildFillPoints(
  snaps: Array<{ followersCount: number }>,
  baseline: number,
  w: number,
  h: number,
): string {
  if (snaps.length < 2) return '';
  const linePoints = buildChartPoints(snaps, baseline, w, h);
  return `${linePoints} ${w},${h} 0,${h}`;
}

// @vercel/og は外部URLを直接 fetch するため CORS や CDN の問題が起きやすい。
// 事前に base64 data URL に変換しておく。
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf  = await res.arrayBuffer();
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const did = await getSessionDid();
    if (!did) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await getActiveEntry(did).catch(() => null);

    const [overallRankData, classRankData, snapshots] = await Promise.all([
      getRankAroundUser(did, 'all', 'daily').catch(() => ({ myRank: null, around: [] })),
      entry
        ? getRankAroundUser(did, entry.class as RankingClass, 'daily').catch(() => ({ myRank: null, around: [] }))
        : Promise.resolve({ myRank: null, around: [] }),
      entry ? getSnapshotsAsc(entry.id, 30).catch(() => []) : Promise.resolve([]),
    ]);

    const name        = entry?.displayName || (entry ? `@${entry.handle}` : 'Player');
    const handle      = entry ? `@${entry.handle}` : '';
    const cls         = entry?.class ?? 'Rookie';
    const clsColor    = CLASS_COLORS[cls] ?? '#94a3b8';
    const gain        = entry?.maxMonthlyGain ?? 0;
    const overallRank = overallRankData.myRank?.rank ?? null;
    const classRank   = classRankData.myRank?.rank ?? null;
    const baseline    = entry?.baselineFollowers ?? 0;

    // アバター画像を data URL に変換（外部 URL fetch の問題を回避）
    const avatarDataUrl = entry?.avatar ? await toDataUrl(entry.avatar) : null;

    const chartW = 340;
    const chartH = 70;
    const linePoints = buildChartPoints(snapshots, baseline, chartW, chartH);
    const fillPoints = buildFillPoints(snapshots, baseline, chartW, chartH);
    const hasChart   = linePoints.length > 0;

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            ...row,
            width: '1200px',
            height: '600px',
            background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 50%, #030812 100%)',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow top-right */}
          <div
            style={{
              position: 'absolute',
              top: '-120px',
              right: '-80px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)',
              display: 'flex',
            }}
          />
          {/* Decorative glow bottom-left */}
          <div
            style={{
              position: 'absolute',
              bottom: '-80px',
              left: '-60px',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)',
              display: 'flex',
            }}
          />

          {/* ── Left: Profile ── */}
          <div
            style={{
              ...col,
              justifyContent: 'center',
              paddingLeft: '72px',
              width: '440px',
              gap: '14px',
              flexShrink: 0,
            }}
          >
            {/* Avatar */}
            {avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarDataUrl}
                width={108}
                height={108}
                style={{
                  borderRadius: '50%',
                  border: '3px solid rgba(56,189,248,0.5)',
                  boxShadow: '0 0 24px rgba(56,189,248,0.25)',
                }}
                alt=""
              />
            ) : (
              <div
                style={{
                  ...row,
                  justifyContent: 'center',
                  width: '108px',
                  height: '108px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e40af, #0369a1)',
                  fontSize: '44px',
                  color: 'white',
                }}
              >
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            {/* Name */}
            <div style={{ display: 'flex', color: 'white', fontSize: '34px', fontWeight: '800', maxWidth: '360px', lineHeight: '1.1' }}>
              {name}
            </div>
            <div style={{ display: 'flex', color: '#64748b', fontSize: '20px' }}>
              {handle}
            </div>

            {/* Class badge */}
            <div
              style={{
                ...row,
                gap: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${clsColor}55`,
                borderRadius: '100px',
                padding: '8px 22px',
              }}
            >
              <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', background: clsColor }} />
              <span style={{ display: 'flex', color: clsColor, fontSize: '18px', fontWeight: '700', marginLeft: '8px' }}>{cls} Class</span>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', color: '#475569', fontSize: '16px', fontWeight: '500' }}>
              {entry ? (entry.isCompleted ? '🏁 Completed' : '🔥 Racing') : '--'}
            </div>
          </div>

          {/* ── Right: Stats + Chart ── */}
          <div
            style={{
              ...col,
              flex: 1,
              justifyContent: 'center',
              paddingRight: '72px',
              gap: '18px',
            }}
          >
            {/* Rank row */}
            <div style={{ ...row, gap: '16px' }}>
              {/* Overall rank */}
              <div
                style={{
                  ...col,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  borderRadius: '18px',
                  padding: '22px 30px',
                  flex: 1,
                }}
              >
                <div style={{ display: 'flex', color: '#475569', fontSize: '11px', letterSpacing: '2px', marginBottom: '8px' }}>
                  TOTAL RANK
                </div>
                <div style={{ display: 'flex', color: '#FFD700', fontSize: '54px', fontWeight: '900', lineHeight: '1' }}>
                  {overallRank != null ? `#${overallRank}` : '--'}
                </div>
              </div>

              {/* Class rank */}
              <div
                style={{
                  ...col,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${clsColor}22`,
                  borderRadius: '18px',
                  padding: '22px 30px',
                  flex: 1,
                }}
              >
                <div style={{ display: 'flex', color: '#475569', fontSize: '11px', letterSpacing: '2px', marginBottom: '8px' }}>
                  {cls.toUpperCase()} RANK
                </div>
                <div style={{ display: 'flex', color: clsColor, fontSize: '54px', fontWeight: '900', lineHeight: '1' }}>
                  {classRank != null ? `#${classRank}` : '--'}
                </div>
              </div>
            </div>

            {/* Monthly gain */}
            <div
              style={{
                ...row,
                background: 'rgba(74,222,128,0.06)',
                border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: '18px',
                padding: '16px 30px',
                gap: '16px',
              }}
            >
              <div style={{ ...col, gap: '2px' }}>
                <div style={{ display: 'flex', color: '#475569', fontSize: '11px', letterSpacing: '2px' }}>30-DAY GAIN</div>
                <div style={{ display: 'flex', color: '#4ade80', fontSize: '44px', fontWeight: '900', lineHeight: '1' }}>
                  +{gain.toLocaleString()}
                </div>
              </div>

              {/* Mini chart */}
              {hasChart && (
                <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                  <svg
                    width={chartW}
                    height={chartH}
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    style={{ display: 'flex', overflow: 'hidden' }}
                  >
                    <polygon points={fillPoints} fill="rgba(74,222,128,0.12)" />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom branding ── */}
          <div
            style={{
              ...row,
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'absolute',
              bottom: '28px',
              left: '72px',
              right: '72px',
            }}
          >
            <div style={{ ...row, gap: '10px' }}>
              <span style={{ display: 'flex', color: '#38bdf8', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>BSKY-GP</span>
              <span style={{ display: 'flex', color: '#334155', fontSize: '13px', marginLeft: '6px' }}>Bluesky Grand Prix</span>
            </div>
            <span style={{ display: 'flex', color: '#1e3a5f', fontSize: '13px' }}>bsky-gp.vercel.app</span>
          </div>

          {/* Separator line */}
          <div
            style={{
              position: 'absolute',
              left: '440px',
              top: '80px',
              bottom: '80px',
              width: '1px',
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)',
              display: 'flex',
            }}
          />
        </div>
      ),
      { width: 1200, height: 600 },
    );

    const imageBuffer = await imageResponse.arrayBuffer();
    const safeHandle  = (entry?.handle ?? did).replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="bsky-gp-${safeHandle}.png"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[profile-card/download] error:', err);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
