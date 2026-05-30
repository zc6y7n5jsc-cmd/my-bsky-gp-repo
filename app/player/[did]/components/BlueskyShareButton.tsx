'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateCardBlob, type CardRenderData } from '@/app/lib/cardCanvas';

interface Props {
  shareText: string;
  card: CardRenderData;
}

type ShareStatus = 'idle' | 'sharing' | 'copied' | 'clipFailed';

export function BlueskyShareButton({ shareText, card }: Props) {
  const t = useTranslations('player');
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');

  const intentUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;

  const handleShare = async () => {
    if (shareStatus === 'sharing') return;
    setShareStatus('sharing');

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

    setShareStatus(imageCopied ? 'copied' : 'clipFailed');
    setTimeout(() => setShareStatus('idle'), 3000);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleShare}
        disabled={shareStatus === 'sharing'}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
          shareStatus === 'copied'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            : shareStatus === 'clipFailed'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30 disabled:opacity-50 disabled:cursor-wait'
        }`}
      >
        {shareStatus === 'sharing'
          ? `⏳ ${t('shareGenerating')}`
          : shareStatus === 'copied'
          ? `✓ ${t('clipboardCopied')}`
          : `🦋 ${t('shareOnBluesky')}`}
      </button>

      {shareStatus === 'copied' && (
        <p className="text-emerald-400 text-xs">{t('clipboardHint')}</p>
      )}
      {shareStatus === 'clipFailed' && (
        <p className="text-amber-400 text-xs">{t('clipboardFailed')}</p>
      )}
    </div>
  );
}
