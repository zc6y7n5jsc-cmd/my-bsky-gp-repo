'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/lib/auth-context';

export function HeroSection() {
  const { user, loading, logout } = useAuth();
  const t = useTranslations('hero');
  const tc = useTranslations('common');

  return (
    <section className="relative overflow-hidden pt-20 pb-12 px-4 text-center">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute top-20 right-1/4 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300 bg-sky-500/10 border border-sky-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          Bluesky Grand Prix
        </span>
        <h1 className="neon-title text-7xl sm:text-8xl font-black uppercase leading-none">
          {t('title')}
        </h1>
        <p className="text-slate-400 text-lg mt-3 font-medium tracking-[0.15em] uppercase">
          {t('subtitle')}
        </p>
      </div>

      {/* Tagline */}
      <p className="text-slate-300 text-base sm:text-lg max-w-md mx-auto mb-8 leading-relaxed">
        {t('description')}
      </p>

      {/* CTA */}
      {loading ? (
        <div className="h-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : user ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 glass px-4 py-3 rounded-2xl neon-ring">
            {user.avatar && (
              <Image
                src={user.avatar}
                alt={user.displayName ?? user.handle}
                width={36}
                height={36}
                className="rounded-full ring-2 ring-sky-400/50"
              />
            )}
            <div className="text-left">
              <p className="font-semibold text-white text-sm leading-tight">{user.displayName}</p>
              <p className="text-slate-400 text-xs">@{user.handle}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="btn-arena px-6 py-2.5 text-sm"
            >
              {t('goToMyPage')}
            </Link>
            <button
              onClick={logout}
              className="px-6 py-2.5 border border-slate-600 hover:border-rose-400/60 text-slate-400 hover:text-white font-semibold rounded-full transition-all active:scale-95 text-sm"
            >
              {tc('logout')}
            </button>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          className="btn-arena px-8 py-3.5 text-base"
        >
          <span>🏁</span>
          {t('joinButton')}
        </Link>
      )}

      {/* Decorative energy stripe */}
      <div className="mt-14 race-stripe max-w-2xl mx-auto opacity-70" />
    </section>
  );
}
