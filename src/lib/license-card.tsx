import type React from 'react';

/* ════════════════════════════════════════════════════════════════
   BSKY-GP profile card — "Official Driver License" design
   Shared markup used by the download route (and preview tooling).
   Pure/presentational only: no DB / session / fs imports here so it
   can be rendered standalone with @vercel/og.
   ════════════════════════════════════════════════════════════════ */

export const CLASS_COLORS: Record<string, string> = {
  Rookie:      '#94a3b8',
  Rising:      '#34d399',
  Challenger:  '#38bdf8',
  Established: '#a78bfa',
  Influencer:  '#fbbf24',
  Star:        '#fb7185',
};

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const row: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' };

export const CARD_W = 1200;
export const CARD_H = 600;

// Font family key registered by the ImageResponse caller (see download route).
export const CARD_FONT = 'CardSans';

function buildChartPoints(snaps: Array<{ followersCount: number }>, baseline: number, w: number, h: number): string {
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

function buildFillPoints(snaps: Array<{ followersCount: number }>, baseline: number, w: number, h: number): string {
  if (snaps.length < 2) return '';
  return `${buildChartPoints(snaps, baseline, w, h)} ${w},${h} 0,${h}`;
}

function fmtDate(d?: Date | null): string {
  if (!d) return '----.--.--';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

// DID から決定的なライセンス番号を生成（GP-XXXX-XXXX）
function makeLicenseId(seed: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hex = h.toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
  return `GP-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

// 決定的なバーコード（バー幅の配列）
function makeBarcode(seed: string, count = 54): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 131) + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    bars.push(1 + (h % 4));
  }
  return bars;
}

export interface LicenseCardData {
  did: string;
  name: string;
  handle: string;          // e.g. "@foo.bsky.social" or ''
  cls: string;
  gain: number;
  overallRank: number | null;
  classRank: number | null;
  season: number;
  startedAt: Date | null;
  endsAt: Date | null;
  isCompleted: boolean;
  registered: boolean;
  baseline: number;
  snapshots: Array<{ followersCount: number }>;
  avatarDataUrl: string | null;
}

export function LicenseCard(d: LicenseCardData): React.ReactElement {
  const clsColor = CLASS_COLORS[d.cls] ?? '#94a3b8';
  const chartW = 656;
  const chartH = 66;
  const linePoints = buildChartPoints(d.snapshots, d.baseline, chartW, chartH);
  const fillPoints = buildFillPoints(d.snapshots, d.baseline, chartW, chartH);
  const hasChart = linePoints.length > 0;

  const seasonNum = d.season;
  const issued = fmtDate(d.startedAt);
  const expires = fmtDate(d.endsAt);
  const licenseId = makeLicenseId(d.did);
  const bars = makeBarcode(d.did + d.cls);
  const statusLabel = d.registered ? (d.isCompleted ? 'COMPLETED' : 'ACTIVE') : 'UNREGISTERED';
  const statusColor = d.registered ? (d.isCompleted ? '#94a3b8' : '#4ade80') : '#64748b';

  const label: React.CSSProperties = {
    display: 'flex', color: '#6b7a9c', fontSize: '12px', letterSpacing: '2px', fontWeight: 700,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: `${CARD_W}px`,
        height: `${CARD_H}px`,
        padding: '34px',
        background: 'linear-gradient(135deg, #0a0e1f 0%, #0c1024 55%, #05060f 100%)',
        fontFamily: `${CARD_FONT}, sans-serif`,
      }}
    >
      {/* Foil border wrapper */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          borderRadius: '30px',
          padding: '2px',
          background: 'linear-gradient(140deg, rgba(124,58,237,0.95) 0%, rgba(56,189,248,0.75) 45%, rgba(251,59,111,0.9) 100%)',
          boxShadow: '0 26px 70px rgba(0,0,0,0.65)',
        }}
      >
        {/* Inner card */}
        <div
          style={{
            ...col,
            flex: 1,
            borderRadius: '28px',
            background: 'linear-gradient(160deg, #0c1026 0%, #0a0e20 55%, #070912 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glows */}
          <div style={{ position: 'absolute', top: '-140px', right: '-90px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)', display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: '-120px', left: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)', display: 'flex' }} />
          {/* Holographic side stripe */}
          <div style={{ position: 'absolute', top: '0px', right: '0px', width: '12px', height: '600px', background: 'linear-gradient(180deg, #22d3ee, #8b5cf6 45%, #fb3b6f)', display: 'flex', opacity: 0.85 }} />

          {/* ── Header ── */}
          <div style={{ ...row, justifyContent: 'space-between', alignItems: 'flex-start', padding: '30px 50px 0 50px' }}>
            <div style={{ ...col }}>
              <div style={{ ...row, alignItems: 'baseline' }}>
                <span style={{ display: 'flex', color: '#ffd24a', fontSize: '32px', fontWeight: 700, letterSpacing: '1px' }}>BSKY-GP</span>
                <span style={{ display: 'flex', color: '#5e6b8a', fontSize: '17px', fontWeight: 700, letterSpacing: '5px', marginLeft: '14px' }}>GRAND PRIX</span>
              </div>
              <span style={{ display: 'flex', color: '#7c8aa8', fontSize: '13px', fontWeight: 700, letterSpacing: '6px', marginTop: '7px' }}>OFFICIAL DRIVER LICENSE</span>
            </div>
            <div style={{ ...col, alignItems: 'flex-end', gap: '9px' }}>
              <div
                style={{
                  ...row,
                  gap: '8px',
                  padding: '8px 20px',
                  borderRadius: '100px',
                  background: `${clsColor}1f`,
                  border: `1px solid ${clsColor}80`,
                  boxShadow: `0 0 22px ${clsColor}40`,
                }}
              >
                <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', background: clsColor }} />
                <span style={{ display: 'flex', color: clsColor, fontSize: '16px', fontWeight: 700, letterSpacing: '1px', marginLeft: '6px' }}>{d.cls.toUpperCase()} CLASS</span>
              </div>
              <span style={{ display: 'flex', color: '#5a6b88', fontSize: '13px', fontWeight: 700, letterSpacing: '3px' }}>SEASON {seasonNum}</span>
            </div>
          </div>

          {/* Header divider */}
          <div style={{ display: 'flex', height: '1px', margin: '20px 50px 0 50px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.18), rgba(255,255,255,0.05), transparent)' }} />

          {/* ── Body ── */}
          <div style={{ ...row, flex: 1, alignItems: 'flex-start', padding: '26px 50px 0 50px', gap: '40px' }}>

            {/* Left: photo + id */}
            <div style={{ ...col, width: '236px', flexShrink: 0, gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  padding: '4px',
                  borderRadius: '22px',
                  background: `linear-gradient(135deg, ${clsColor}, rgba(56,189,248,0.65))`,
                  boxShadow: `0 0 26px ${clsColor}45`,
                }}
              >
                {d.avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.avatarDataUrl} width={188} height={188} style={{ borderRadius: '18px', objectFit: 'cover' }} alt="" />
                ) : (
                  <div
                    style={{
                      ...row,
                      justifyContent: 'center',
                      width: '188px',
                      height: '188px',
                      borderRadius: '18px',
                      background: 'linear-gradient(135deg, #1e3a8a, #0c4a6e)',
                      fontSize: '78px',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {d.name[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>

              {/* Member ID + dates */}
              <div style={{ ...col, gap: '12px', paddingLeft: '4px' }}>
                <div style={{ ...col, gap: '4px' }}>
                  <span style={label}>LICENSE NO.</span>
                  <span style={{ display: 'flex', color: '#e7ecf7', fontSize: '21px', fontWeight: 700, letterSpacing: '1px' }}>{licenseId}</span>
                </div>
                <div style={{ ...row, gap: '26px' }}>
                  <div style={{ ...col, gap: '4px' }}>
                    <span style={label}>ISSUED</span>
                    <span style={{ display: 'flex', color: '#aab6cf', fontSize: '16px', fontWeight: 700 }}>{issued}</span>
                  </div>
                  <div style={{ ...col, gap: '4px' }}>
                    <span style={label}>EXPIRES</span>
                    <span style={{ display: 'flex', color: '#aab6cf', fontSize: '16px', fontWeight: 700 }}>{expires}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: name + fields + chart */}
            <div style={{ ...col, flex: 1, gap: '18px' }}>
              <div style={{ ...col, gap: '2px' }}>
                <div style={{ display: 'flex', color: 'white', fontSize: '42px', fontWeight: 700, maxWidth: '560px', lineHeight: '1.05' }}>{d.name}</div>
                <div style={{ display: 'flex', color: '#6b7a9c', fontSize: '19px', fontWeight: 400 }}>{d.handle}</div>
              </div>

              {/* Stat fields */}
              <div style={{ ...row, gap: '14px' }}>
                <div style={{ ...col, flex: 1, gap: '8px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(255,210,74,0.06)', border: '1px solid rgba(255,210,74,0.22)' }}>
                  <span style={label}>TOTAL RANK</span>
                  <span style={{ display: 'flex', color: '#ffd24a', fontSize: '40px', fontWeight: 700, lineHeight: '1' }}>{d.overallRank != null ? `#${d.overallRank}` : '--'}</span>
                </div>
                <div style={{ ...col, flex: 1, gap: '8px', padding: '16px 20px', borderRadius: '16px', background: `${clsColor}10`, border: `1px solid ${clsColor}33` }}>
                  <span style={label}>CLASS RANK</span>
                  <span style={{ display: 'flex', color: clsColor, fontSize: '40px', fontWeight: 700, lineHeight: '1' }}>{d.classRank != null ? `#${d.classRank}` : '--'}</span>
                </div>
                <div style={{ ...col, flex: 1, gap: '8px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(251,59,111,0.08)', border: '1px solid rgba(251,59,111,0.25)' }}>
                  <span style={label}>30-DAY GAIN</span>
                  <span style={{ display: 'flex', color: '#fb3b6f', fontSize: '40px', fontWeight: 700, lineHeight: '1' }}>+{d.gain.toLocaleString()}</span>
                </div>
              </div>

              {/* Performance strip */}
              <div style={{ ...col, gap: '8px', padding: '14px 22px', borderRadius: '16px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.16)' }}>
                <div style={{ ...row, justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={label}>30-DAY PERFORMANCE</span>
                  <span style={{ display: 'flex', color: statusColor, fontSize: '13px', fontWeight: 700, letterSpacing: '2px' }}>{statusLabel}</span>
                </div>
                {hasChart ? (
                  <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'flex' }}>
                    <polygon points={fillPoints} fill="rgba(56,189,248,0.14)" />
                    <polyline points={linePoints} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div style={{ display: 'flex', height: `${chartH}px`, alignItems: 'center', color: '#3a4a6c', fontSize: '14px' }}>No data yet</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ ...row, justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 50px 26px 50px' }}>
            {/* Barcode */}
            <div style={{ ...row, alignItems: 'flex-end', gap: '2px', height: '30px' }}>
              {bars.map((w, i) => (
                <div key={i} style={{ display: 'flex', width: `${w}px`, height: '30px', background: i % 7 === 0 ? '#64748b' : '#cbd5e1' }} />
              ))}
            </div>

            {/* Hologram seal + url */}
            <div style={{ ...row, gap: '16px', alignItems: 'center' }}>
              <span style={{ display: 'flex', color: '#46587e', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>bsky-gp.vercel.app</span>
              <div
                style={{
                  ...row,
                  justifyContent: 'center',
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 32% 30%, rgba(56,189,248,0.95), rgba(124,58,237,0.85) 52%, rgba(251,59,111,0.85))',
                  boxShadow: '0 0 18px rgba(124,58,237,0.65)',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                }}
              >
                GP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
