'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateCardBlob, type CardRenderData } from '@/app/lib/cardCanvas';

export type { CardRenderData };

interface Props {
  did: string;
  handle: string;
  siteUrl: string;
  card: CardRenderData;
}

type ShareStatus = 'idle' | 'sharing' | 'copied' | 'clipFailed' | 'error';

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

  /** Bluesky にシェア（画像クリップボードコピー → toast → intent URL を開く） */
  const handleShareOnBluesky = async () => {
    if (shareStatus === 'sharing') return;
    setShareStatus('sharing');

    const shareText = `${t('blueskyShareText')}\n@${handle}: ${playerUrl}`;
    const intentUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;

    // ユーザージェスチャーが有効な間にウィンドウを先行確保する
    // （noopener を付けると null が返るため外す → 直後に navigate するので安全）
    const win = window.open('about:blank', '_blank');

    // カード生成 → クリップボードコピー
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

    // 先に確保したウィンドウを Bluesky に遷移させる
    if (win) {
      win.location.href = intentUrl;
    } else {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }

    // toast 表示
    if (imageCopied) {
      setShareStatus('copied');
    } else {
      setShareStatus('clipFailed');
    }
    setTimeout(() => setShareStatus('idle'), 6000);
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
              : shareStatus === 'clipFailed' || shareStatus === 'error'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30 disabled:opacity-50 disabled:cursor-wait'
          }`}
        >
          {shareStatus === 'sharing'
            ? `⏳ ${t('downloadCardGenerating')}`
            : shareStatus === 'copied'
            ? `✓ ${t('clipboardCopied')}`
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
      {shareStatus === 'clipFailed' && (
        <p className="mt-3 text-amber-400 text-xs">{t('clipboardFailed')}</p>
      )}
    </div>
  );
}
