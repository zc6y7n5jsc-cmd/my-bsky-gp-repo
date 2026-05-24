'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  did: string;
  handle: string;
  siteUrl: string;
}

export function ShareSection({ did, handle, siteUrl }: Props) {
  const t = useTranslations('myPage');
  const [copied, setCopied]           = useState(false);
  const [downloading, setDownloading] = useState(false);

  const playerUrl = `${siteUrl}/player/${encodeURIComponent(did)}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: no-op
    }
  };

  const downloadCard = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/profile-card/download', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `profile-${handle}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('card download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  const shareText = encodeURIComponent(
    `BSKY-GP 30-day follower challenge!\n\n@${handle}: ${playerUrl}\n\n#BSKY_GP`,
  );
  const blueskyIntentUrl = `https://bsky.app/intent/compose?text=${shareText}`;

  return (
    <div className="glass glass-hover p-5">
      <h3 className="font-bold text-white text-base mb-1">🔗 {t('shareHeading')}</h3>
      <p className="text-slate-500 text-xs mb-4">{t('shareSubtitle')}</p>

      <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-4 py-2.5 mb-4 border border-white/5">
        <span className="text-slate-400 text-xs truncate flex-1 font-mono">{playerUrl}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadCard}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {downloading ? `⏳ ${t('downloadCardGenerating')}` : `🖼 ${t('downloadCard')}`}
        </button>

        <a
          href={blueskyIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-all"
        >
          🦋 {t('shareOnBluesky')}
        </a>

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

        <a
          href={`/player/${encodeURIComponent(did)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/8 transition-all"
        >
          👤 {t('viewPlayerPage')}
        </a>
      </div>
    </div>
  );
}
