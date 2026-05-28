'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function RegisterButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const router = useRouter();
  const t  = useTranslations('myPage');
  const tc = useTranslations('common');

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/entries/register', { method: 'POST' });
      if (res.ok || res.status === 409) {
        // 201 Created or 409 Already participating → どちらも参加登録済み状態
        router.refresh();
        return;
      }
      const data: { error?: string } = await res.json().catch(() => ({}));
      setError(data.error ?? tc('error'));
      console.error('[register] failed:', res.status, data);
    } catch (err) {
      setError(tc('error'));
      console.error('[register] network error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleRegister}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-full transition-all text-sm"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {tc('loading')}
          </>
        ) : (
          `🚀 ${t('joinNow')}`
        )}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
