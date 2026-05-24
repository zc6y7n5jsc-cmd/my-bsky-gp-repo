'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { RankingPeriod, ChartDataEntry } from '@/src/lib/rankings';

const COLORS = ['#38bdf8', '#f59e0b', '#34d399'];
const PERIOD_VALUES: RankingPeriod[] = ['daily', 'weekly', 'monthly'];

export function GainChart() {
  const t = useTranslations('ranking');

  const [period, setPeriod]     = useState<RankingPeriod>('daily');
  const [entries, setEntries]   = useState<ChartDataEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const periodLabel = (p: RankingPeriod) => t(p as 'daily' | 'weekly' | 'monthly');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rankings/chart?class=all&period=${period}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          setEntries(json.entries ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period]);

  // Merge per-entry time series into a unified [{date, handle: gain, ...}] array
  const chartData = (() => {
    const dateSet = new Set<string>();
    for (const e of entries) for (const d of e.data) dateSet.add(d.date);
    const dates = [...dateSet].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const e of entries) {
        const point = e.data.find((d) => d.date === date);
        row[e.handle] = point?.gain ?? 0;
      }
      return row;
    });
  })();

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="glass glass-hover h-full flex flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-white text-base">📈 {t('gainTrend')}</h2>
          <p className="text-slate-500 text-xs mt-0.5">{t('top3Subtitle')}</p>
        </div>
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

      {/* Chart */}
      <div className="flex-1 min-h-[180px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            {t('noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value, name) => [`+${Number(value).toLocaleString()}`, `@${name}`]}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>@{value}</span>
                )}
              />
              {entries.map((entry, i) => (
                <Line
                  key={entry.handle}
                  type="monotone"
                  dataKey={entry.handle}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
