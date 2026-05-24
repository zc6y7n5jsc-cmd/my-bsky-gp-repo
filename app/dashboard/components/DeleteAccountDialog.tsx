'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function DeleteAccountDialog() {
  const t = useTranslations('myPage');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const confirmed = input === 'DELETE';

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users/delete', { method: 'POST' });
      if (!res.ok) throw new Error(t('deleteError'));
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('deleteError'));
      setLoading(false);
    }
  };

  return (
    <>
      <div className="glass p-5 border border-red-500/10">
        <h3 className="font-bold text-red-400 text-base mb-1">⚠️ {t('dangerZone')}</h3>
        <p className="text-slate-500 text-xs mb-4">{t('dangerZoneDesc')}</p>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-full text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
        >
          {t('deleteButton')}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative glass border border-red-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">{t('deleteModalTitle')}</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {t('deleteModalDescPre')}
              <span className="text-red-400 font-semibold">{t('deleteModalDescIrreversible')}</span>
              {t('deleteModalDescPost')}
            </p>

            <div className="mb-4">
              <label className="text-slate-400 text-xs mb-2 block">
                {t('deleteConfirmLabelPre')}{' '}
                <span className="text-red-400 font-mono font-bold">DELETE</span>{' '}
                {t('deleteConfirmLabelPost')}
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 font-mono"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setOpen(false); setInput(''); setError(''); }}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium border border-white/10 text-slate-400 hover:text-white transition-all"
              >
                {t('deleteCancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={!confirmed || loading}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? t('deleting') : t('deleteSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
