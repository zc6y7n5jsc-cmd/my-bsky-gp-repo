'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function LoginForm() {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get('error');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    setSubmitting(true);
    window.location.href = `/api/auth/login?handle=${encodeURIComponent(clean)}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="neon-title text-4xl font-black uppercase">
              BSKY-GP
            </h1>
          </Link>
          <p className="mt-2 text-slate-400 text-sm tracking-[0.15em] uppercase">Bluesky Grand Prix</p>
        </div>

        <div className="glass p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">{t('heading')}</h2>
            <p className="mt-1 text-slate-400 text-sm">{t('description')}</p>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-900/40 border border-red-700/50 px-4 py-3 text-sm text-red-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('handleLabel')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 select-none">
                  @
                </span>
                <input
                  id="handle"
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="yourname.bsky.social"
                  required
                  disabled={submitting}
                  className="w-full pl-7 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !handle.trim()}
              className="btn-arena w-full py-2.5 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('submitting') : t('submitButton')}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center">
            {t('privacyConsentPre')}{' '}
            <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline">
              {tc('privacyPolicy')}
            </Link>
            {t('privacyConsentPost') ? ` ${t('privacyConsentPost')}` : ''}
          </p>
        </div>

        <p className="text-center text-xs text-slate-600">
          <Link href="/" className="hover:text-slate-400 transition-colors">
            ← {tc('backToTop')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
