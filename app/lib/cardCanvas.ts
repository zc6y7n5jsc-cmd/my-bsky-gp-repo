// プロフィールカード画像を Canvas で生成する共有ロジック。
// ブラウザ専用（document / Image / canvas を使用）。
// ダッシュボードと個人ページの両方からインポートして利用する。
//
// デザイン: 公式ドライバーライセンス風（フォイル枠 / ホログラム / ティアチップ /
// ライセンス番号 / 発行・有効期限 / バーコード / ランク・ゲイン / パフォーマンスチャート）。

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
  // ライセンス表記用（任意）
  season?: number;
  startedAt?: string | null; // ISO
  endsAt?: string | null;    // ISO
}

const CLASS_COLORS: Record<string, string> = {
  Rookie: '#94a3b8', Rising: '#34d399', Challenger: '#38bdf8',
  Established: '#a78bfa', Influencer: '#fbbf24', Star: '#fb7185',
};

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
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

function fmtDate(iso?: string | null): string {
  if (!iso) return '----.--.--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '----.--.--';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function makeLicenseId(seed: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hex = h.toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
  return `GP-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function makeBarcode(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 131) + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    bars.push(1 + (h % 4));
  }
  return bars;
}

// 文字間隔つきテキスト（letterSpacing 未対応ブラウザでも動くよう手動描画）
function fillTextTracked(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number,
): number {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx - spacing - x; // total width
}

function trackedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

export async function generateCardBlob(data: CardRenderData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  await drawCard(ctx, data);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
      'image/png',
    );
  });
}

export async function drawCard(ctx: CanvasRenderingContext2D, data: CardRenderData): Promise<void> {
  const W = 1200, H = 600;
  const clsColor = CLASS_COLORS[data.cls] ?? '#94a3b8';

  const PAD = 34;            // outer padding (arena frame)
  const CARD_X = PAD, CARD_Y = PAD, CARD_W = W - PAD * 2, CARD_H = H - PAD * 2;
  const LM = CARD_X + 50;    // content left margin
  const RM = CARD_X + CARD_W - 50; // content right edge

  // colors
  const GOLD = '#ffd24a', ROSE = '#fb3b6f', SKY = '#38bdf8';
  const LABEL = '#6b7a9c', MUTE = '#7c8aa8';

  // ── Arena background ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0e1f');
  bg.addColorStop(0.55, '#0c1024');
  bg.addColorStop(1, '#05060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Foil border + inner card ──
  const foil = ctx.createLinearGradient(CARD_X, CARD_Y, CARD_X + CARD_W, CARD_Y + CARD_H);
  foil.addColorStop(0, '#7c3aed');
  foil.addColorStop(0.45, '#38bdf8');
  foil.addColorStop(1, '#fb3b6f');
  rrect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 30);
  ctx.fillStyle = foil;
  ctx.fill();

  const innerGrad = ctx.createLinearGradient(CARD_X, CARD_Y, CARD_X, CARD_Y + CARD_H);
  innerGrad.addColorStop(0, '#0c1026');
  innerGrad.addColorStop(0.55, '#0a0e20');
  innerGrad.addColorStop(1, '#070912');
  rrect(ctx, CARD_X + 2, CARD_Y + 2, CARD_W - 4, CARD_H - 4, 28);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // ── Clip to inner card for glows + holo stripe ──
  ctx.save();
  rrect(ctx, CARD_X + 2, CARD_Y + 2, CARD_W - 4, CARD_H - 4, 28);
  ctx.clip();

  const g1 = ctx.createRadialGradient(CARD_X + CARD_W - 40, CARD_Y + 10, 0, CARD_X + CARD_W - 40, CARD_Y + 10, 320);
  g1.addColorStop(0, 'rgba(56,189,248,0.16)');
  g1.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H);

  const g2 = ctx.createRadialGradient(CARD_X + 20, CARD_Y + CARD_H - 10, 0, CARD_X + 20, CARD_Y + CARD_H - 10, 300);
  g2.addColorStop(0, 'rgba(124,58,237,0.16)');
  g2.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H);

  // holographic right-edge stripe
  const holo = ctx.createLinearGradient(0, CARD_Y, 0, CARD_Y + CARD_H);
  holo.addColorStop(0, '#22d3ee');
  holo.addColorStop(0.45, '#8b5cf6');
  holo.addColorStop(1, '#fb3b6f');
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = holo;
  ctx.fillRect(CARD_X + CARD_W - 14, CARD_Y + 2, 12, CARD_H - 4);
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.textBaseline = 'alphabetic';

  // ── Header ──
  ctx.textAlign = 'left';
  ctx.font = '700 32px Arial';
  ctx.fillStyle = GOLD;
  ctx.fillText('BSKY-GP', LM, CARD_Y + 64);
  const wWordmark = ctx.measureText('BSKY-GP').width;
  ctx.font = '700 17px Arial';
  ctx.fillStyle = '#5e6b8a';
  fillTextTracked(ctx, 'GRAND PRIX', LM + wWordmark + 16, CARD_Y + 62, 5);
  ctx.font = '700 13px Arial';
  ctx.fillStyle = MUTE;
  fillTextTracked(ctx, 'OFFICIAL DRIVER LICENSE', LM, CARD_Y + 90, 6);

  // class chip (right) with glow
  const chipLabel = `${data.cls.toUpperCase()} CLASS`;
  ctx.font = '700 16px Arial';
  const chipTextW = trackedWidth(ctx, chipLabel, 1);
  const chipPadX = 20, dotR = 5, dotGap = 12;
  const chipW = chipPadX + dotR * 2 + dotGap + chipTextW + chipPadX;
  const chipH = 38;
  const chipX = RM - chipW, chipY = CARD_Y + 30;
  ctx.save();
  ctx.shadowColor = clsColor;
  ctx.shadowBlur = 22;
  rrect(ctx, chipX, chipY, chipW, chipH, 19);
  ctx.fillStyle = hexA(clsColor, 0.12);
  ctx.fill();
  ctx.restore();
  rrect(ctx, chipX, chipY, chipW, chipH, 19);
  ctx.strokeStyle = hexA(clsColor, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(chipX + chipPadX + dotR, chipY + chipH / 2, dotR, 0, Math.PI * 2);
  ctx.fillStyle = clsColor;
  ctx.fill();
  ctx.font = '700 16px Arial';
  ctx.fillStyle = clsColor;
  ctx.textBaseline = 'middle';
  fillTextTracked(ctx, chipLabel, chipX + chipPadX + dotR * 2 + dotGap, chipY + chipH / 2 + 1, 1);
  ctx.textBaseline = 'alphabetic';

  // season (right, under chip)
  const seasonText = `SEASON ${data.season ?? 1}`;
  ctx.font = '700 13px Arial';
  ctx.fillStyle = '#5a6b88';
  const seasonW = trackedWidth(ctx, seasonText, 3);
  fillTextTracked(ctx, seasonText, RM - seasonW, chipY + chipH + 22, 3);

  // ── Header divider ──
  const sepY = CARD_Y + 116;
  const sep = ctx.createLinearGradient(LM, 0, RM, 0);
  sep.addColorStop(0, 'rgba(255,255,255,0)');
  sep.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  sep.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = sep;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LM, sepY);
  ctx.lineTo(RM, sepY);
  ctx.stroke();

  // ── Left column: photo ──
  const PHOTO = 188, FRAME = PHOTO + 8;
  const PX = LM, PY = sepY + 28;
  // foil frame
  const pf = ctx.createLinearGradient(PX, PY, PX + FRAME, PY + FRAME);
  pf.addColorStop(0, clsColor);
  pf.addColorStop(1, 'rgba(56,189,248,0.65)');
  ctx.save();
  ctx.shadowColor = hexA(clsColor, 0.45);
  ctx.shadowBlur = 26;
  rrect(ctx, PX, PY, FRAME, FRAME, 22);
  ctx.fillStyle = pf;
  ctx.fill();
  ctx.restore();
  // photo
  const proxiedUrl = data.avatarUrl ? `/api/avatar-proxy?url=${encodeURIComponent(data.avatarUrl)}` : null;
  const avatarImg = proxiedUrl ? await loadImage(proxiedUrl) : null;
  ctx.save();
  rrect(ctx, PX + 4, PY + 4, PHOTO, PHOTO, 18);
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, PX + 4, PY + 4, PHOTO, PHOTO);
  } else {
    const ag = ctx.createLinearGradient(PX, PY, PX + FRAME, PY + FRAME);
    ag.addColorStop(0, '#1e3a8a');
    ag.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = ag;
    ctx.fillRect(PX + 4, PY + 4, PHOTO, PHOTO);
    ctx.fillStyle = 'white';
    ctx.font = '700 78px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.displayName[0]?.toUpperCase() ?? '?', PX + 4 + PHOTO / 2, PY + 4 + PHOTO / 2 + 4);
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // License No.
  const licenseId = makeLicenseId(data.handle || data.displayName);
  let ly = PY + FRAME + 30;
  ctx.font = '700 12px Arial';
  ctx.fillStyle = LABEL;
  fillTextTracked(ctx, 'LICENSE NO.', PX, ly, 2);
  ctx.font = '700 21px Arial';
  ctx.fillStyle = '#e7ecf7';
  fillTextTracked(ctx, licenseId, PX, ly + 26, 1);

  // Issued / Expires
  ly += 26 + 30;
  const colGap = 116;
  ctx.font = '700 12px Arial';
  ctx.fillStyle = LABEL;
  fillTextTracked(ctx, 'ISSUED', PX, ly, 2);
  fillTextTracked(ctx, 'EXPIRES', PX + colGap, ly, 2);
  ctx.font = '700 16px Arial';
  ctx.fillStyle = '#aab6cf';
  ctx.fillText(fmtDate(data.startedAt), PX, ly + 22);
  ctx.fillText(fmtDate(data.endsAt), PX + colGap, ly + 22);

  // Barcode
  const bars = makeBarcode(data.handle || data.displayName, 46);
  const barH = 30;
  const barY = CARD_Y + CARD_H - 50 - barH;
  let bx = PX;
  bars.forEach((bw, i) => {
    ctx.fillStyle = i % 7 === 0 ? '#64748b' : '#cbd5e1';
    ctx.fillRect(bx, barY, bw, barH);
    bx += bw + 2;
  });

  // ── Right column ──
  const RX = PX + FRAME + 40;
  const RW = RM - RX;

  // Name + handle
  ctx.fillStyle = 'white';
  ctx.font = '700 42px Arial';
  let nameText = data.displayName;
  while (ctx.measureText(nameText).width > RW && nameText.length > 2) nameText = nameText.slice(0, -1);
  if (nameText !== data.displayName) nameText = nameText.slice(0, -1) + '…';
  ctx.fillText(nameText, RX, PY + 36);
  ctx.font = '400 19px Arial';
  ctx.fillStyle = LABEL;
  ctx.fillText(data.handle, RX, PY + 64);

  // Stat fields (3 across)
  const fieldGap = 14;
  const fieldW = Math.floor((RW - fieldGap * 2) / 3);
  const fieldH = 96;
  const fieldY = PY + 92;
  const drawField = (i: number, bgc: string, bord: string, label: string, value: string, valColor: string) => {
    const fx = RX + i * (fieldW + fieldGap);
    rrect(ctx, fx, fieldY, fieldW, fieldH, 16);
    ctx.fillStyle = bgc;
    ctx.fill();
    rrect(ctx, fx, fieldY, fieldW, fieldH, 16);
    ctx.strokeStyle = bord;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '700 12px Arial';
    ctx.fillStyle = LABEL;
    fillTextTracked(ctx, label, fx + 20, fieldY + 32, 2);
    ctx.font = '700 40px Arial';
    ctx.fillStyle = valColor;
    ctx.fillText(value, fx + 20, fieldY + 76);
  };
  drawField(0, 'rgba(255,210,74,0.06)', 'rgba(255,210,74,0.22)', 'TOTAL RANK',
    data.overallRank != null ? `#${data.overallRank}` : '--', GOLD);
  drawField(1, hexA(clsColor, 0.06), hexA(clsColor, 0.2), 'CLASS RANK',
    data.classRank != null ? `#${data.classRank}` : '--', clsColor);
  drawField(2, 'rgba(251,59,111,0.08)', 'rgba(251,59,111,0.25)', '30-DAY GAIN',
    `+${data.gain.toLocaleString()}`, ROSE);

  // Performance strip
  const stripY = fieldY + fieldH + 18;
  const stripH = CARD_Y + CARD_H - 44 - stripY;
  rrect(ctx, RX, stripY, RW, stripH, 16);
  ctx.fillStyle = 'rgba(56,189,248,0.05)';
  ctx.fill();
  rrect(ctx, RX, stripY, RW, stripH, 16);
  ctx.strokeStyle = 'rgba(56,189,248,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = '700 12px Arial';
  ctx.fillStyle = LABEL;
  fillTextTracked(ctx, '30-DAY PERFORMANCE', RX + 22, stripY + 28, 2);
  const statusLabel = data.isCompleted ? 'COMPLETED' : 'ACTIVE';
  const statusColor = data.isCompleted ? '#94a3b8' : '#4ade80';
  ctx.font = '700 13px Arial';
  ctx.fillStyle = statusColor;
  const stW = trackedWidth(ctx, statusLabel, 2);
  fillTextTracked(ctx, statusLabel, RX + RW - 22 - stW, stripY + 28, 2);

  // chart
  if (data.snapshots.length >= 2) {
    const cX = RX + 22, cW = RW - 44;
    const cTop = stripY + 42, cBot = stripY + stripH - 16;
    const cH = cBot - cTop;
    const gains = data.snapshots.map((s) => s.followersCount - data.baseline);
    const minG = Math.min(0, ...gains);
    const maxG = Math.max(...gains, 1);
    const range = maxG - minG || 1;
    const pts = data.snapshots.map((s, i) => ({
      px: cX + (i / (data.snapshots.length - 1)) * cW,
      py: cBot - ((s.followersCount - data.baseline - minG) / range) * cH,
    }));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].px, pts[0].py);
    pts.slice(1).forEach((p) => ctx.lineTo(p.px, p.py));
    ctx.lineTo(cX + cW, cBot);
    ctx.lineTo(cX, cBot);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.14)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0].px, pts[0].py);
    pts.slice(1).forEach((p) => ctx.lineTo(p.px, p.py));
    ctx.strokeStyle = SKY;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // ── Footer: hologram seal + url ──
  const sealR = 26;
  const sealX = RM - sealR, sealY = CARD_Y + CARD_H - 26 - sealR;
  const seal = ctx.createRadialGradient(sealX - 8, sealY - 8, 0, sealX, sealY, sealR);
  seal.addColorStop(0, 'rgba(56,189,248,0.95)');
  seal.addColorStop(0.52, 'rgba(124,58,237,0.85)');
  seal.addColorStop(1, 'rgba(251,59,111,0.85)');
  ctx.save();
  ctx.shadowColor = 'rgba(124,58,237,0.65)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.fillStyle = seal;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'white';
  ctx.font = '700 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GP', sealX, sealY + 1);

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '700 14px Arial';
  ctx.fillStyle = '#46587e';
  ctx.fillText('bsky-gp.vercel.app', sealX - sealR - 16, sealY);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// #rrggbb + alpha → rgba()
function hexA(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
