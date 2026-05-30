'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  endsAt: string; // ISO string
  isCompleted: boolean;
}

function calcRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, done: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  return { days, hours, mins, secs, done: false };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="glass w-16 h-16 flex items-center justify-center text-2xl font-black text-white stat-num rounded-2xl neon-ring">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-slate-600 text-xs mt-1">{label}</span>
    </div>
  );
}

export function CountdownTimer({ endsAt, isCompleted }: Props) {
  const t = useTranslations('myPage');
  const [rem, setRem] = useState(() => calcRemaining(endsAt));

  useEffect(() => {
    if (rem.done) return;
    const id = setInterval(() => setRem(calcRemaining(endsAt)), 1_000);
    return () => clearInterval(id);
  }, [endsAt, rem.done]);

  if (isCompleted || rem.done) {
    return (
      <div className="glass glass-hover h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-3">🏁</div>
        <p className="text-white font-bold text-lg">{t('challengeComplete')}</p>
        <p className="text-slate-500 text-sm mt-1">{t('challengeCompleteMsg')}</p>
      </div>
    );
  }

  return (
    <div className="glass glass-hover h-full flex flex-col items-center justify-center p-6 text-center">
      <p className="text-slate-400 text-sm font-medium mb-4">{t('countdown')}</p>
      <div className="flex gap-3 items-end">
        <Digit value={rem.days}  label={t('days')} />
        <span className="text-slate-600 text-xl mb-4">:</span>
        <Digit value={rem.hours} label={t('hours')} />
        <span className="text-slate-600 text-xl mb-4">:</span>
        <Digit value={rem.mins}  label={t('minutes')} />
        <span className="text-slate-600 text-xl mb-4">:</span>
        <Digit value={rem.secs}  label={t('seconds')} />
      </div>
      <p className="text-slate-600 text-xs mt-4">
        {t('endsOn', { date: new Date(endsAt).toLocaleDateString() })}
      </p>
    </div>
  );
}
