'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  initialCount: number;
}

function useCountUp(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCurrent(Math.round(ease * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return current;
}

export function ParticipantCounter({ initialCount }: Props) {
  const t = useTranslations('common');

  const [count, setCount] = useState(initialCount);
  const displayed = useCountUp(count, 1400);
  const show = count >= 50;

  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const json = await res.json();
          setCount(json.participantCount ?? 0);
        }
      } catch {
        // ignore
      }
    }
    const id = setInterval(refresh, 120_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass glass-hover h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="text-4xl mb-1">🌍</div>

      {show ? (
        <>
          <p
            key={count}
            className="stat-num text-5xl font-black text-white animate-count-up"
            style={{ textShadow: '0 0 24px rgba(56,189,248,.4)' }}
          >
            {displayed.toLocaleString()}
          </p>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            {t('participantsRacing')}
          </p>
          <p className="text-slate-600 text-xs mt-3">
            {t('joinChallenge')}
          </p>
        </>
      ) : (
        <>
          <p className="text-white font-bold text-xl mt-1">{t('comingSoon')}</p>
          {count > 0 && (
            <p className="text-slate-500 text-sm mt-2">
              {t('currentlyN', { count: count.toLocaleString() })}
            </p>
          )}
          <p className="text-slate-600 text-xs mt-3">
            {t('unlockAt50')}
          </p>
        </>
      )}
    </div>
  );
}
