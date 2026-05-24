'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { DeadHeatResult, RankingPeriod } from '@/src/lib/rankings';

const PERIOD_VALUES: RankingPeriod[] = ['daily', 'weekly', 'monthly'];

interface Props {
  initialData: DeadHeatResult | null;
}

export function DeadHeatCard({ initialData }: Props) {
  const t  = useTranslations('deadheat');
  const tr = useTranslations('ranking');

  const [data, setData]     = useState<DeadHeatResult | null>(initialData);
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rankings/deadheat?class=all&period=${period}`);
        if (res.ok && !cancelled) setData(await res.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [period]);

  const periodLabel = (p: RankingPeriod) =>
    tr(p as 'daily' | 'weekly' | 'monthly');

  const overtakeMsg = (diff: number): string => {
    if (diff === 0) return t('tied');
    if (diff === 1) return t('overtakeOne');
    return t('overtake', { diff: diff.toLocaleString() });
  };

  return (
    <div className="glass glass-hover h-full flex flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-white text-base flex items-center gap-1.5">
            ⚔️ {t('title')}
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">{t('subtitle')}</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
          {PERIOD_VALUES.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                period === p ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          {t('noData')}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center gap-3">
          {/* Overtake message */}
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-bold">
              {overtakeMsg(data.diff)}
            </span>
          </div>

          {/* Player 1 */}
          <PlayerRow row={data.first} highlight />

          {/* VS divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-700" />
            <span className="text-slate-500 text-xs font-bold tracking-widest">VS</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-700" />
          </div>

          {/* Player 2 */}
          <PlayerRow row={data.second} />

          {/* Gain diff */}
          <div className="text-center mt-1">
            <span className="text-slate-600 text-xs">
              {t('diffLabel', {
                diff: data.diff.toLocaleString(),
                period: periodLabel(period),
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ row, highlight = false }: { row: DeadHeatResult['first']; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${highlight ? 'bg-sky-500/8 border border-sky-500/15' : 'bg-white/3'}`}>
      <span className="text-slate-500 text-xs font-mono w-5 text-right flex-shrink-0">
        #{row.rank}
      </span>
      {row.avatar ? (
        <Image
          src={row.avatar}
          alt={row.handle}
          width={36}
          height={36}
          className="rounded-full ring-1 ring-white/10 flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm flex-shrink-0">
          {row.handle[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {row.displayName || `@${row.handle}`}
        </p>
        <p className="text-slate-500 text-xs">@{row.handle}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-emerald-400 text-sm font-bold">+{row.gain.toLocaleString()}</p>
      </div>
    </div>
  );
}
