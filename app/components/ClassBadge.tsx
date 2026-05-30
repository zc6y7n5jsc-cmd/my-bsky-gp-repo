const CLASS_STYLES: Record<string, string> = {
  Rookie:      'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  Rising:      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Challenger:  'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_14px_-4px] shadow-sky-500/60',
  Established: 'bg-violet-500/20 text-violet-200 border border-violet-400/40 shadow-[0_0_14px_-4px] shadow-violet-500/60',
  Influencer:  'bg-amber-500/20 text-amber-200 border border-amber-400/40 shadow-[0_0_16px_-4px] shadow-amber-500/70',
  Star:        'bg-rose-500/20 text-rose-200 border border-rose-400/50 shadow-[0_0_18px_-3px] shadow-rose-500/80',
};

const CLASS_DOTS: Record<string, string> = {
  Rookie:      'bg-slate-400',
  Rising:      'bg-emerald-400',
  Challenger:  'bg-sky-400',
  Established: 'bg-violet-400',
  Influencer:  'bg-amber-400',
  Star:        'bg-rose-400',
};

interface Props {
  cls: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export function ClassBadge({ cls, pulse = false, size = 'sm' }: Props) {
  const style = CLASS_STYLES[cls] ?? 'bg-slate-600/20 text-slate-400 border border-slate-600/30';
  const dot = CLASS_DOTS[cls] ?? 'bg-slate-500';
  const px = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${px} ${style} ${pulse ? 'animate-badge-pulse' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {cls}
    </span>
  );
}
