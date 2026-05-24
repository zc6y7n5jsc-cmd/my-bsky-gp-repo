'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTranslations } from 'next-intl';

interface Snap {
  followersCount: number;
  capturedAt: string;
}

interface Props {
  snapshots: Snap[];
  baselineFollowers: number;
}

export function PlayerChart({ snapshots, baselineFollowers }: Props) {
  const t = useTranslations('player');

  const data = snapshots.map((s) => ({
    date: new Date(s.capturedAt).toISOString().split('T')[0],
    gain: s.followersCount - baselineFollowers,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm py-12">
        {t('chartNoData')}
      </div>
    );
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="playerGainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
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
          formatter={(value) => [`+${Number(value).toLocaleString()}`, t('gainLabel')]}
        />
        <Area
          type="monotone"
          dataKey="gain"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#playerGainGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
