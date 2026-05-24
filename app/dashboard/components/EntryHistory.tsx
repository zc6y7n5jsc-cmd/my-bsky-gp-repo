import { getTranslations } from 'next-intl/server';
import { ClassBadge } from '@/app/components/ClassBadge';

interface Entry {
  id: number;
  season: number;
  class: string;
  startedAt: Date;
  endsAt: Date;
  isCompleted: boolean;
  isBanned: boolean;
  baselineFollowers: number;
  maxMonthlyGain: number | null;
}

interface Props {
  entries: Entry[];
  activeEntryId?: number;
}

export async function EntryHistory({ entries, activeEntryId }: Props) {
  const t = await getTranslations('myPage');
  const history = entries.filter((e) => e.id !== activeEntryId);
  if (history.length === 0) return null;

  return (
    <div className="glass glass-hover p-5">
      <h3 className="font-bold text-white text-base mb-4">🗂️ {t('pastChallenges')}</h3>
      <div className="space-y-2">
        {history.map((entry) => {
          const gain = entry.maxMonthlyGain ?? 0;
          const start = new Date(entry.startedAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
          const end = new Date(entry.endsAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
          return (
            <div
              key={entry.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors"
            >
              <span className="text-slate-500 text-xs font-mono flex-shrink-0">
                S{entry.season}
              </span>
              <ClassBadge cls={entry.class} />
              <div className="flex-1 text-slate-500 text-xs">
                {start} 〜 {end}
              </div>
              {entry.isBanned ? (
                <span className="text-red-400 text-xs font-medium">BAN</span>
              ) : entry.isCompleted ? (
                <div className="text-right">
                  <p className="text-emerald-400 text-sm font-bold">+{gain.toLocaleString()}</p>
                  <p className="text-slate-600 text-xs">{t('monthlyGain')}</p>
                </div>
              ) : (
                <span className="text-sky-400 text-xs font-medium">{t('inRace')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
