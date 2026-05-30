import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getChampions, getAvailableSeasons, CLASS_DISPLAY_ORDER } from '@/src/lib/champions';
import { ClassBadge } from '../components/ClassBadge';
import { FadeInCard } from '../components/FadeInCard';
import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Hall of Fame',
  description: '歴代シーズンチャンピオン一覧。BSKY-GP 各クラスの月間フォロワー増加数最高記録保持者を掲載。',
  openGraph: {
    title: 'Hall of Fame | BSKY-GP',
    description: 'All-time Bluesky Grand Prix season champions by class.',
  },
};

const CLASS_GLOW: Record<string, string> = {
  Star:        'rgba(244, 63, 94, 0.25)',
  Influencer:  'rgba(251, 191, 36, 0.22)',
  Established: 'rgba(139, 92, 246, 0.22)',
  Challenger:  'rgba(14, 165, 233, 0.22)',
  Rising:      'rgba(16, 185, 129, 0.22)',
  Rookie:      'rgba(100, 116, 139, 0.22)',
};

const MEDAL_EMOJI: Record<string, string> = {
  Star:        '👑',
  Influencer:  '🏆',
  Established: '🥇',
  Challenger:  '🎖️',
  Rising:      '🌟',
  Rookie:      '🚀',
};

interface Props {
  searchParams: Promise<{ season?: string }>;
}

export default async function HallOfFamePage({ searchParams }: Props) {
  const { season: seasonParam } = await searchParams;

  const [t, tc, seasons] = await Promise.all([
    getTranslations('hallOfFame'),
    getTranslations('classes'),
    getAvailableSeasons().catch(() => [] as number[]),
  ]);

  const selectedSeason = seasonParam ? parseInt(seasonParam, 10) : (seasons[0] ?? null);
  const champions = selectedSeason
    ? await getChampions(selectedSeason).catch(() => [])
    : [];

  // Build a map for fast lookup: class → champion
  const championByClass = new Map(champions.map((c) => [c.class, c]));

  return (
    <main className="min-h-screen pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-10 px-4 text-center">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/8 blur-3xl" />
          <div className="absolute top-10 left-1/4 w-64 h-64 rounded-full bg-rose-500/6 blur-3xl" />
          <div className="absolute top-10 right-1/4 w-64 h-64 rounded-full bg-violet-500/6 blur-3xl" />
        </div>

        <div className="text-6xl mb-4 animate-medal-float inline-block">🏆</div>
        <h1
          className="text-4xl sm:text-6xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent leading-none mb-3"
          style={{ fontFamily: 'var(--font-display), var(--font-geist-sans), sans-serif', filter: 'drop-shadow(0 0 22px rgba(251,191,36,.35))' }}
        >
          {t('title')}
        </h1>
        <p className="text-slate-400 text-base font-medium tracking-[0.15em] uppercase">{t('subtitle')}</p>

        <div className="mt-8 race-stripe max-w-md mx-auto opacity-60" />
      </section>

      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* Season tabs */}
        {seasons.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {seasons.map((s) => {
              const active = s === selectedSeason;
              return (
                <Link
                  key={s}
                  href={`/hall-of-fame?season=${s}`}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                      : 'glass text-slate-400 hover:text-slate-200 hover:bg-white/8'
                  }`}
                >
                  {t('season', { season: s })}
                </Link>
              );
            })}
          </div>
        )}

        {/* Champions grid */}
        {seasons.length === 0 ? (
          <FadeInCard delay={0}>
            <div className="glass px-6 py-16 text-center text-slate-500">
              {t('noSeasons')}
            </div>
          </FadeInCard>
        ) : champions.length === 0 ? (
          <FadeInCard delay={0}>
            <div className="glass px-6 py-16 text-center text-slate-500">
              {t('noChampions')}
            </div>
          </FadeInCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLASS_DISPLAY_ORDER.map((cls, i) => {
              const champion = championByClass.get(cls);
              if (!champion) return null;

              const glow = CLASS_GLOW[cls] ?? 'rgba(100,116,139,0.18)';
              const medal = MEDAL_EMOJI[cls] ?? '🏅';
              const profileUrl = `https://bsky.app/profile/${champion.handle}`;

              return (
                <FadeInCard key={cls} delay={i * 80}>
                  <div
                    className="glass champion-card-glow h-full flex flex-col p-5 transition-all duration-300"
                    style={{ '--champion-glow': glow } as React.CSSProperties}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <ClassBadge cls={cls} size="md" />
                      <span
                        className="text-3xl"
                        style={{ animation: `medalFloat ${2.8 + i * 0.3}s ease-in-out infinite` }}
                      >
                        {medal}
                      </span>
                    </div>

                    {/* Profile */}
                    <div className="flex items-center gap-3 mb-4">
                      {champion.avatar ? (
                        <Image
                          src={champion.avatar}
                          alt={champion.displayName ?? champion.handle}
                          width={52}
                          height={52}
                          className="rounded-full ring-2 ring-amber-400/40 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-[52px] h-[52px] rounded-full bg-slate-700 ring-2 ring-amber-400/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-400 text-xl">?</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm leading-tight truncate">
                          {champion.displayName ?? champion.handle}
                        </p>
                        <p className="text-slate-400 text-xs truncate">@{champion.handle}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2">
                        <span className="text-slate-400 text-xs">{t('monthlyGain')}</span>
                        <span className="text-amber-300 font-bold text-sm">
                          +{champion.totalGain.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2">
                        <span className="text-slate-400 text-xs">{t('decidedAt')}</span>
                        <span className="text-slate-300 text-xs">
                          {champion.decidedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Profile link */}
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full text-center py-2 rounded-xl border border-white/10 text-slate-400 hover:text-sky-300 hover:border-sky-500/40 text-xs font-medium transition-all"
                    >
                      {t('viewProfile')} ↗
                    </a>
                  </div>
                </FadeInCard>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
