'use client';

import { useTranslations } from 'next-intl';

const RULE_KEYS = ['register', 'race', 'classSystem', 'periods'] as const;
const RULE_ICONS: Record<string, string> = {
  register:    '🚀',
  race:        '📅',
  classSystem: '🏷️',
  periods:     '📊',
};

export function RulesCard() {
  const t = useTranslations('rules');

  return (
    <div className="glass glass-hover h-full flex flex-col p-5">
      <h2 className="font-bold text-white text-base mb-4">📋 {t('title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RULE_KEYS.map((key) => (
          <div key={key} className="flex gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
            <span className="text-2xl flex-shrink-0 leading-tight">{RULE_ICONS[key]}</span>
            <div>
              <p className="text-white text-sm font-semibold mb-0.5">{t(`${key}.title`)}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{t(`${key}.desc`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
