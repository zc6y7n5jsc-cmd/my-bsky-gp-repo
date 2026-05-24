'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getNextMilestone } from '@/src/lib/milestones';
import type { EntryClass } from '@/src/lib/constants';

interface Props {
  currentFollowers: number;
  currentClass: EntryClass;
}

const CLASS_EMOJIS: Record<string, string> = {
  Rising:      '🌱',
  Challenger:  '⚡',
  Established: '🔮',
  Influencer:  '🌟',
  Star:        '🏆',
};

export function MilestoneToast({ currentFollowers, currentClass }: Props) {
  const t  = useTranslations('milestone');
  const tc = useTranslations('common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const milestone = getNextMilestone(currentFollowers, currentClass);
      if (!milestone) return;

      const key = `milestone-toast-${currentClass}`;
      if (sessionStorage.getItem(key)) return;

      setVisible(true);
      sessionStorage.setItem(key, '1');

      const timer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('[MilestoneToast]', err);
    }
  }, [currentFollowers, currentClass]);

  if (!visible) return null;

  const milestone = getNextMilestone(currentFollowers, currentClass);
  if (!milestone) return null;

  const emoji = CLASS_EMOJIS[milestone.nextClass] ?? '🚀';

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-xs w-full"
      style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <div className="glass p-4 border border-amber-500/30 bg-amber-500/8">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-snug">
              {t('toast', { nextClass: milestone.nextClass, count: milestone.needed.toLocaleString() })}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              {t('hint', { threshold: milestone.nextThreshold.toLocaleString() })}
            </p>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 text-lg leading-none"
            aria-label={tc('close')}
          >
            ×
          </button>
        </div>

        <div className="mt-3 h-1 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(
                100,
                (currentFollowers / milestone.nextThreshold) * 100,
              ).toFixed(1)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
