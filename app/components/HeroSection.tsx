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
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute top-20 right-1/4 w-64 h-64 rounded-full bg-amber-500/8 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="mb-6">
        <h1 className="text-7xl sm:text-8xl font-black tracking-tighter bg-gradient-to-r from-sky-400 via-blue-300 to-amber-400 bg-clip-text text-transparent leading-none">
          {t('title')}
        </h1>
        <p className="text-slate-400 text-lg mt-2 font-medium tracking-wide">
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
          <div className="flex items-center gap-3 glass px-4 py-3 rounded-2xl">
            {user.avatar && (
              <Image
                src={user.avatar}
                alt={user.displayName ?? user.handle}
                width={36}
                height={36}
                className="rounded-full ring-2 ring-sky-500/40"
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
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-semibold rounded-full transition-all text-sm"
            >
              {t('goToMyPage')}
            </Link>
            <button
              onClick={logout}
              className="px-6 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-white font-semibold rounded-full transition-all active:scale-95 text-sm"
            >
              {tc('logout')}
            </button>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-bold text-base shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-400/30 hover:shadow-xl"
        >
          <span>🏁</span>
          {t('joinButton')}
        </Link>
      )}

      {/* Decorative race stripe */}
      <div className="mt-14 h-px race-stripe opacity-30" />
    </section>
  );
}
