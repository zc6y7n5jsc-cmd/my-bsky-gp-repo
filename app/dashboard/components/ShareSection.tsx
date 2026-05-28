'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Snapshot {
  followersCount: number;
}

export interface CardRenderData {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  cls: string;
  gain: number;
  overallRank: number | null;
  classRank: number | null;
  snapshots: Snapshot[];
  baseline: number;
  isCompleted: boolean;
}

interface Props {
  did: string;
  handle: string;
  siteUrl: string;
  card: CardRenderData;
}

type ShareStatus = 'idle' | 'sharing' | 'copied' | 'error';

const CLASS_COLORS: Record<string, string> = {
  Rookie: '#94a3b8', Rising: '#34d399', Challenger: '#38bdf8',
  Established: '#a78bfa', Influencer: '#fbbf24', Star: '#fb7185',
};

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 5000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

async function generateCardBlob(data: CardRenderData): Promise<Blob> {
  const W = 1200, H = 600;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const clsColor = CLASS_COLORS[data.cls] ?? '#94a3b8';

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, W * 0.8, H);
  bg.addColorStop(0, '#0a1628');
  bg.addColorStop(0.5, '#0f1f3d');
  bg.addColorStop(1, '#030812');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Avatar ──
  const AV_R = 54;
  const LP = 72; // left padding
  const AV_X = LP + AV_R;
  const AV_Y = 208;
  const proxiedUrl = data.avatarUrl
    ? `/api/avatar-proxy?url=${encodeURIComponent(data.avatarUrl)}`
    : null;
  const avatarImg = proxiedUrl ? await loadImage(proxiedUrl) : null;

  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_X, AV_Y, AV_R, 0, Math.PI * 2);
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
  } else {
    const grad = ctx.createLinearGradient(AV_X - AV_R, AV_Y - AV_R, AV_X + AV_R, AV_Y + AV_R);
    grad.addColorStop(0, '#1e40af');
    grad.addColorStop(1, '#0369a1');
    ctx.fillStyle = grad;
    ctx.fillRect(AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // Avatar ring
  ctx.beginPath();
  ctx.arc(AV_X, AV_Y, AV_R + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(56,189,248,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (!avatarImg) {
    ctx.save();
    ctx.font = 'bold 44px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.displayName[0]?.toUpperCase() ?? '?', AV_X, AV_Y);
    ctx.restore();
  }

  // ── Name ──
  let NAME_Y = AV_Y + AV_R + 40;
  ctx.save();
  ctx.font = 'bold 34px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let nameText = data.displayName;
  while (ctx.measureText(nameText).width > 330 && nameText.length > 2) nameText = nameText.slice(0, -1);
  if (nameText !== data.displayName) nameText += '…';
  ctx.fillText(nameText, LP, NAME_Y);
  ctx.restore();

  // ── Handle ──
  ctx.save();
  ctx.font = '20px Arial';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(data.handle, LP, NAME_Y + 34);
  ctx.restore();

  // ── Class badge ──
  const BADGE_Y = NAME_Y + 60;
  ctx.save();
  ctx.font = 'bold 18px Arial';
  const badgeLabel = `${data.cls} Class`;
  const labelW = ctx.measureText(badgeLabel).width;
  const DOT_X = LP + 20;
  const TEXT_X = DOT_X + 10 + 8;
  const badgeW = TEXT_X - LP + labelW + 22;
  const badgeH = 40;
  rrect(ctx, LP, BADGE_Y, badgeW, badgeH, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  rrect(ctx, LP, BADGE_Y, badgeW, badgeH, 20);
  ctx.strokeStyle = `${clsColor}55`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(DOT_X, BADGE_Y + badgeH / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = clsColor;
  ctx.fill();
  ctx.fillStyle = clsColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeLabel, TEXT_X, BADGE_Y + badgeH / 2);
  ctx.restore();

  // ── Status ──
  ctx.save();
  ctx.font = '16px Arial';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(data.isCompleted ? '  Completed' : '  Racing', LP, BADGE_Y + badgeH + 28);
  ctx.restore();

  // ── Separator line ──
  const SEP_X = 444;
  ctx.save();
  const sepGrad = ctx.createLinearGradient(0, 80, 0, H - 80);
  sepGrad.addColorStop(0, 'rgba(255,255,255,0)');
  sepGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  sepGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SEP_X, 80);
  ctx.lineTo(SEP_X, H - 80);
  ctx.stroke();
  ctx.restore();

  // ── RIGHT COLUMN ──
  const RX = SEP_X + 36;
  const RW = W - RX - LP;

  // Rank cards
  const RANK_Y = 68;
  const RANK_H = 130;
  const RANK_W = Math.floor((RW - 16) / 2);

  function drawRankCard(x: number, borderColor: string, label: string, value: string, valueColor: string) {
    rrect(ctx, x, RANK_Y, RANK_W, RANK_H, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    rrect(ctx, x, RANK_Y, RANK_W, RANK_H, 18);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '11px Arial';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x + 28, RANK_Y + 28);
    ctx.font = 'bold 52px Arial';
    ctx.fillStyle = valueColor;
    ctx.fillText(value, x + 28, RANK_Y + 100);
  }

  ctx.save();
  drawRankCard(RX, 'rgba(255,215,0,0.15)', 'TOTAL RANK',
    data.overallRank != null ? `#${data.overallRank}` : '--', '#FFD700');
  drawRankCard(RX + RANK_W + 16, `${clsColor}22`, `${data.cls.toUpperCase()} RANK`,
    data.classRank != null ? `#${data.classRank}` : '--', clsColor);
  ctx.restore();

  // Gain panel
  const GAIN_Y = RANK_Y + RANK_H + 18;
  const GAIN_H = 108;
  ctx.save();
  rrect(ctx, RX, GAIN_Y, RW, GAIN_H, 18);
  ctx.fillStyle = 'rgba(74,222,128,0.06)';
  ctx.fill();
  rrect(ctx, RX, GAIN_Y, RW, GAIN_H, 18);
  ctx.strokeStyle = 'rgba(74,222,128,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = '11px Arial';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('30-DAY GAIN', RX + 28, GAIN_Y + 28);
  ctx.font = 'bold 44px Arial';
  ctx.fillStyle = '#4ade80';
  ctx.fillText(`+${data.gain.toLocaleString()}`, RX + 28, GAIN_Y + 88);
  ctx.restore();

  // Mini chart
  if (data.snapshots.length >= 2) {
    const CX = RX + RW - 340;
    const CY = GAIN_Y + 10;
    const CW = 320;
    const CH = GAIN_H - 20;
    const gains = data.snapshots.map(s => s.followersCount - data.baseline);
    const minG = Math.min(0, ...gains);
    const maxG = Math.max(...gains, 1);
    const range = maxG - minG || 1;
    const pts = data.snapshots.map((s, i) => ({
      px: CX + (i / (data.snapshots.length - 1)) * CW,
      py: CY + CH - ((s.followersCount - data.baseline - minG) / range) * (CH - 6),
    }));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].px, pts[0].py);
    pts.slice(1).forEach(p => ctx.lineTo(p.px, p.py));
    ctx.lineTo(CX + CW, CY + CH);
    ctx.lineTo(CX, CY + CH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,222,128,0.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0].px, pts[0].py);
    pts.slice(1).forEach(p => ctx.lineTo(p.px, p.py));
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // ── Branding ──
  const BRAND_Y = H - 26;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('BSKY-GP', LP, BRAND_Y);
  const bW = ctx.measureText('BSKY-GP').width;
  ctx.font = '13px Arial';
  ctx.fillStyle = '#334155';
  ctx.fillText('Bluesky Grand Prix', LP + bW + 10, BRAND_Y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e3a5f';
  ctx.fillText('bsky-gp.vercel.app', W - LP, BRAND_Y);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
      'image/png',
    );
  });
}

export function ShareSection({ did, handle, siteUrl, card }: Props) {
  const t = useTranslations('myPage');
  const [copied, setCopied]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');

  const playerUrl = `${siteUrl}/player/${encodeURIComponent(did)}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* non-supported env */ }
  };

  /** ① カードをダウンロード */
  const handleDownloadCard = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const blob = await generateCardBlob(card);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `bsky-gp-${handle}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (err) {
      console.error('[card download]', err);
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  /** ③ Bluesky にシェア（画像をクリップボードへ + Intent URL を開く） */
  const handleShareOnBluesky = async () => {
    if (shareStatus === 'sharing') return;
    setShareStatus('sharing');

    const shareText = `${t('blueskyShareText')}\n@${handle}: ${playerUrl}`;
    const intentUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;

    let imageCopied = false;
    try {
      const blob = await generateCardBlob(card);
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        imageCopied = true;
      }
    } catch (err) {
      console.warn('[bluesky share] clipboard write failed:', err);
    }

    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    setShareStatus(imageCopied ? 'copied' : 'idle');
    if (imageCopied) setTimeout(() => setShareStatus('idle'), 4000);
  };

  return (
    <div className="glass glass-hover p-5">
      <h3 className="font-bold text-white text-base mb-1">🔗 {t('shareHeading')}</h3>
      <p className="text-slate-500 text-xs mb-4">{t('shareSubtitle')}</p>

      <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-4 py-2.5 mb-4 border border-white/5">
        <span className="text-slate-400 text-xs truncate flex-1 font-mono">{playerUrl}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* カードをダウンロード */}
        <button
          onClick={handleDownloadCard}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {downloading ? `⏳ ${t('downloadCardGenerating')}` : `🖼 ${t('downloadCard')}`}
        </button>

        {/* Bluesky にシェア */}
        <button
          onClick={handleShareOnBluesky}
          disabled={shareStatus === 'sharing'}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            shareStatus === 'copied'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : shareStatus === 'error'
              ? 'bg-red-500/20 text-red-300 border-red-500/30'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30 disabled:opacity-50 disabled:cursor-wait'
          }`}
        >
          {shareStatus === 'sharing'
            ? `⏳ ${t('downloadCardGenerating')}`
            : shareStatus === 'copied'
            ? `✓ ${t('clipboardCopied')}`
            : shareStatus === 'error'
            ? t('downloadError')
            : `🦋 ${t('shareOnBluesky')}`}
        </button>

        {/* URL をコピー */}
        <button
          onClick={copyUrl}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-white/8 hover:bg-white/12 text-slate-300 border border-white/10 hover:border-white/20'
          }`}
        >
          {copied ? `✓ ${t('urlCopied')}` : `📋 ${t('copyUrl')}`}
        </button>

        {/* 個人ページへ */}
        <a
          href={`/player/${encodeURIComponent(did)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/8 transition-all"
        >
          👤 {t('viewPlayerPage')}
        </a>
      </div>

      {/* ステータスメッセージ */}
      {downloadError && (
        <p className="mt-3 text-red-400 text-xs">{t('downloadError')}</p>
      )}
      {shareStatus === 'copied' && (
        <p className="mt-3 text-emerald-400 text-xs">{t('clipboardHint')}</p>
      )}
    </div>
  );
}
