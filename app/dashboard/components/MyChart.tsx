'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTranslations } from 'next-intl';

interface Snap {
  followersCount: number;
  capturedAt: string; // ISO string
}

interface Props {
  snapshots: Snap[];
  baselineFollowers: number;
  startedAt: string;
  endsAt: string;
}

export function MyChart({ snapshots, baselineFollowers }: Props) {
  const t = useTranslations('myPage');

  const data = snapshots.map((s) => ({
    date: new Date(s.capturedAt).toISOString().split('T')[0],
    gain: s.followersCount - baselineFollowers,
    followers: s.followersCount,
  }));

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (data.length === 0) {
    return (
      <div className="glass glass-hover h-full flex flex-col p-5">
        <h3 className="font-bold text-white text-base mb-2">📈 {t('chartTitle')}</h3>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center">
          {t('chartNoData')}<br />{t('chartNoDataHint')}
        </div>
      </div>
    );
  }

  const maxGain = Math.max(...data.map((d) => d.gain), 0);

  return (
    <div className="glass glass-hover h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-base">📈 {t('chartTitle')}</h3>
          <p className="text-slate-500 text-xs mt-0.5">
            {t('baseline', { count: baselineFollowers.toLocaleString() })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gain stat-num text-xl font-black">+{maxGain.toLocaleString()}</p>
          <p className="text-slate-600 text-xs">{t('maxGain')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="gainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
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
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
              labelFormatter={(label) => formatDate(String(label))}
              formatter={(value, name) => [
                String(name) === 'gain'
                  ? `+${Number(value).toLocaleString()}`
                  : Number(value).toLocaleString(),
                String(name) === 'gain' ? t('maxGain') : t('currentFollowers'),
              ]}
            />
            <Area
              type="monotone"
              dataKey="gain"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#gainGradient)"
              dot={data.length <= 10 ? { r: 3, fill: '#38bdf8', strokeWidth: 0 } : false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
