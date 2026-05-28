'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const RULE_KEYS = ['register', 'race', 'classSystem', 'periods'] as const;
const RULE_ICONS: Record<string, string> = {
  register:    '🚀',
  race:        '📅',
  classSystem: '🏷️',
  periods:     '📊',
};

type RuleKey = typeof RULE_KEYS[number];

export function RulesCard() {
  const t  = useTranslations('rules');
  const tc = useTranslations('common');
  const [selected, setSelected] = useState<RuleKey | null>(null);

  return (
    <>
      <div className="glass glass-hover h-full flex flex-col p-5">
        <h2 className="font-bold text-white text-base mb-4">📋 {t('title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RULE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="flex gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors text-left w-full cursor-pointer"
            >
              <span className="text-2xl flex-shrink-0 leading-tight">{RULE_ICONS[key]}</span>
              <div>
                <p className="text-white text-sm font-semibold mb-0.5">{t(`${key}.title`)}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{t(`${key}.desc`)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass max-w-sm w-full p-6 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{RULE_ICONS[selected]}</span>
              <h3 className="text-white font-bold text-lg">{t(`${selected}.title`)}</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {t(`${selected}.detail`)}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-sm transition-colors"
            >
              {tc('close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
