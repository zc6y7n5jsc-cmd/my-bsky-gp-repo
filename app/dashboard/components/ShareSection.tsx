'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  did: string;
  handle: string;
  siteUrl: string;
}

type ShareStatus = 'idle' | 'sharing' | 'copied' | 'error';

export function ShareSection({ did, handle, siteUrl }: Props) {
  const t = useTranslations('myPage');
  const [copied, setCopied]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');

  const playerUrl = `${siteUrl}/player/${encodeURIComponent(did)}`;

  /** プロフィールカード画像を API から取得して Blob を返す */
  async function fetchCardBlob(): Promise<Blob> {
    const res = await fetch('/api/profile-card/download', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 非対応環境では何もしない
    }
  };

  /** ① カードをダウンロード */
  const handleDownloadCard = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const blob = await fetchCardBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `bsky-gp-${handle}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // クリックが処理されてからオブジェクト URL を解放する
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
      const blob = await fetchCardBlob();
      // Clipboard API で PNG 画像をコピー（HTTPS + ユーザージェスチャが必要）
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        imageCopied = true;
      }
    } catch (err) {
      // クリップボードコピーが失敗してもシェアは続行
      console.warn('[bluesky share] clipboard write failed:', err);
    }

    // Intent URL を開く（画像コピー成・否に関わらず）
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
