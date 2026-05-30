'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ClassBadge } from './ClassBadge';
import type { RankingsResult, RankingClass, RankingPeriod } from '@/src/lib/rankings';

const CLASS_VALUES: RankingClass[] = [
  'all', 'Rookie', 'Rising', 'Challenger', 'Established', 'Influencer', 'Star',
];

const PERIOD_VALUES: RankingPeriod[] = ['daily', 'weekly', 'monthly'];

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Props {
  initialData: RankingsResult;
}

export function RankingCard({ initialData }: Props) {
  const t = useTranslations('ranking');

  const [classFilter, setClassFilter] = useState<RankingClass>('all');
  const [period, setPeriod]           = useState<RankingPeriod>('daily');
  const [data, setData]               = useState<RankingsResult>(initialData);
  const [loading, setLoading]         = useState(false);

  // Build tab labels inside the component so useTranslations is called at hook level
  const classTabs = [
    { label: t('overall'), value: 'all' as RankingClass },
    ...(['Rookie', 'Rising', 'Challenger', 'Established', 'Influencer', 'Star'] as RankingClass[])
      .map((v) => ({ label: v, value: v })),
  ];

  const periodTabs = PERIOD_VALUES.map((v) => ({
    label: t(v as 'daily' | 'weekly' | 'monthly'),
    value: v,
  }));

  const fetch_ = useCallback(async (cls: RankingClass, per: RankingPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rankings?class=${cls}&period=${per}&page=1`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_(classFilter, period);
  }, [classFilter, period, fetch_]);

  const updatedAt = data.lastUpdatedAt
    ? new Date(data.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="glass glass-hover h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-bold text-white text-lg">🏆 {t('title')}</h2>
        {updatedAt && (
          <span className="text-slate-500 text-xs">{t('updatedAt', { time: updatedAt })}</span>
        )}
      </div>

      {/* Class tabs */}
      <div className="px-4 pb-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {classTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setClassFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                classFilter === tab.value
                  ? 'bg-violet-500/20 text-violet-200 border border-violet-400/40 neon-ring'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 w-fit border border-white/5">
          {periodTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                period === tab.value
                  ? 'bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 max-h-[480px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.rankings.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {t('noData')}
          </div>
        ) : (
          data.rankings.map((row) => (
            <div
              key={row.did}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 ${
                row.rank <= 3 ? `rank-${row.rank}` : ''
              }`}
            >
              {/* Rank */}
              <div className="w-7 text-center flex-shrink-0">
                {RANK_MEDALS[row.rank] ? (
                  <span className="text-lg">{RANK_MEDALS[row.rank]}</span>
                ) : (
                  <span className="text-slate-500 text-sm stat-num">{row.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {row.avatar ? (
                  <Image
                    src={row.avatar}
                    alt={row.handle}
                    width={32}
                    height={32}
                    className="rounded-full ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">
                    {row.handle[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate leading-tight">
                  {row.displayName || `@${row.handle}`}
                </p>
                <p className="text-slate-500 text-xs truncate">@{row.handle}</p>
              </div>

              {/* Class badge */}
              <ClassBadge cls={row.class} pulse={row.rank === 1} />

              {/* Gain */}
              <div className="text-right flex-shrink-0 ml-1">
                <p className="text-gain stat-num text-sm font-bold">
                  +{row.gain.toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: total count */}
      {data.total > 0 && (
        <div className="px-5 py-3 border-t border-white/5 text-slate-500 text-xs">
          {t('participantCount', { count: data.total.toLocaleString() })}
        </div>
      )}
    </div>
  );
}
