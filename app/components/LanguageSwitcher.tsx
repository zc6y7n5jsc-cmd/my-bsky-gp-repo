'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/src/i18n/request';

const LOCALE_LABELS: Record<Locale, { flag: string; label: string; short: string }> = {
  ja:      { flag: '🇯🇵', label: '日本語',    short: 'JP' },
  en:      { flag: '🇬🇧', label: 'English',   short: 'EN' },
  'pt-BR': { flag: '🇧🇷', label: 'Português', short: 'PT' },
  'zh-TW': { flag: '🇹🇼', label: '繁體中文',  short: 'TW' },
  de:      { flag: '🇩🇪', label: 'Deutsch',   short: 'DE' },
  fr:      { flag: '🇫🇷', label: 'Français',  short: 'FR' },
};

const ALL_LOCALES: Locale[] = ['ja', 'en', 'pt-BR', 'zh-TW', 'de', 'fr'];

interface Props {
  currentLocale: Locale;
}

export function LanguageSwitcher({ currentLocale }: Props) {
  const [open, setOpen]       = useState(false);
  const [pending, setPending] = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);
  const router                = useRouter();

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const switchLocale = async (locale: Locale) => {
    if (locale === currentLocale || pending) return;
    setPending(true);
    setOpen(false);
    try {
      await fetch('/api/i18n/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    } catch (err) {
      console.error('[LanguageSwitcher]', err);
    } finally {
      setPending(false);
    }
  };

  const current = LOCALE_LABELS[currentLocale];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/6 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/8 hover:border-white/16 transition-all disabled:opacity-50"
        aria-label="Switch language"
      >
        <span>{current.flag}</span>
        <span>{current.short}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 glass border border-white/10 rounded-2xl overflow-hidden z-50 shadow-xl"
          style={{ animation: 'fadeInUp 0.2s ease both' }}
        >
          {ALL_LOCALES.map((locale) => {
            const info = LOCALE_LABELS[locale];
            const active = locale === currentLocale;
            return (
              <button
                key={locale}
                onClick={() => switchLocale(locale)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors
                  ${active
                    ? 'bg-sky-500/15 text-sky-300 font-semibold'
                    : 'text-slate-300 hover:bg-white/6 hover:text-white'
                  }`}
              >
                <span className="text-base">{info.flag}</span>
                <span>{info.label}</span>
                {active && (
                  <span className="ml-auto text-sky-400 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
