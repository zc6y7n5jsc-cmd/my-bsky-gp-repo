'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  entryId: number;
  gain: number;
  rank: number | null;
  cls: string;
}

const CONFETTI_COLORS = ['#FFD700', '#38bdf8', '#4ade80', '#f472b6', '#a78bfa', '#fb7185', '#fbbf24'];

interface Particle {
  id: number;
  left: string;
  color: string;
  delay: string;
  duration: string;
  size: number;
  isCircle: boolean;
  drift: number;
}

function Confetti() {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 70 }, (_, i) => {
      const t = (i * 137.508) % 360;
      return {
        id: i,
        left: `${(i / 70) * 100}vw`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${(i * 0.03) % 1.6}s`,
        duration: `${2.2 + (i % 8) * 0.25}s`,
        size: 7 + (i % 6),
        isCircle: i % 3 !== 0,
        drift: ((t % 200) - 100),
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size,
            borderRadius: p.isCircle ? '50%' : '2px',
            backgroundColor: p.color,
            animationName: 'confettiFall',
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationTimingFunction: 'ease-in',
            animationFillMode: 'forwards',
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function CompletionModal({ entryId, gain, rank, cls }: Props) {
  const t  = useTranslations('completion');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `completion-modal-${entryId}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
      localStorage.setItem(key, '1');
    }
  }, [entryId]);

  if (!open) return null;

  const medal = rank != null ? (RANK_MEDAL[rank] ?? '') : '';

  return (
    <>
      <Confetti />

      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div
          className="glass w-full max-w-sm p-8 text-center relative"
          style={{
            border: '1px solid rgba(251,191,36,0.3)',
            animation: 'fadeInUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none"
            aria-label={tc('close')}
          >
            ×
          </button>

          <div className="text-6xl mb-4 animate-count-up">🎉</div>

          <h2 className="text-white font-black text-2xl mb-1">{t('title')}</h2>
          <p className="text-slate-400 text-sm mb-6">{t('subtitle')}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
            >
              <p className="text-slate-500 text-xs mb-1 tracking-widest uppercase">{t('monthlyGain')}</p>
              <AnimatedNumber
                value={gain}
                prefix="+"
                className="text-gain stat-num font-black text-3xl"
              />
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              <p className="text-slate-500 text-xs mb-1 tracking-widest uppercase">{t('finalRank')}</p>
              <p className="text-amber-300 stat-num font-black text-3xl">
                {rank != null ? `${medal}#${rank}` : '--'}
              </p>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-6">{t('class')}: {cls}</p>

          <div className="flex flex-col gap-3">
            <a
              href="/api/entries/register"
              className="btn-arena w-full py-3 text-sm"
            >
              🚀 {t('retryButton')}
            </a>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
