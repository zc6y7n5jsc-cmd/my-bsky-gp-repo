import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { getRankings, getParticipantCount, getDeadHeat } from '@/src/lib/rankings';
import { HeroSection } from './components/HeroSection';
import { RankingCard } from './components/RankingCard';
import { DeadHeatCard } from './components/DeadHeatCard';
import { GainChart } from './components/GainChart';
import { ParticipantCounter } from './components/ParticipantCounter';
import { RulesCard } from './components/RulesCard';
import { FadeInCard } from './components/FadeInCard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import type { Locale } from '@/src/i18n/request';
import { DEVELOPER_BSKY_URL } from '@/src/lib/constants';
import { getAvailableSeasons } from '@/src/lib/champions';

export default async function HomePage() {
  const [rankingsResult, participantCount, deadheat, tf, tc, locale, hasChampions] = await Promise.all([
    getRankings('all', 'daily', 1, 20).catch(() => ({
      rankings: [], total: 0, page: 1, pageSize: 20, lastUpdatedAt: null,
    })),
    getParticipantCount().catch(() => 0),
    getDeadHeat('all', 'daily').catch(() => null),
    getTranslations('footer'),
    getTranslations('common'),
    getLocale(),
    getAvailableSeasons().then((s) => s.length > 0).catch(() => false),
  ]);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <HeroSection />

      {/* Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16 space-y-4">

        {/* Row 1: Ranking (large) + DeadHeat + Counter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Ranking — spans 2 cols on desktop */}
          <FadeInCard delay={0} className="lg:col-span-2 md:row-span-2 min-h-[520px]">
            <RankingCard initialData={rankingsResult} />
          </FadeInCard>

          {/* DeadHeat */}
          <FadeInCard delay={80} className="min-h-[260px]">
            <DeadHeatCard initialData={deadheat} />
          </FadeInCard>

          {/* Participant Counter */}
          <FadeInCard delay={160} className="min-h-[260px]">
            <ParticipantCounter initialCount={participantCount} />
          </FadeInCard>

          {/* Gain Chart — spans 2 cols on desktop, below DeadHeat+Counter */}
          <FadeInCard delay={240} className="md:col-span-2 lg:col-span-2 min-h-[260px]">
            <GainChart />
          </FadeInCard>
        </div>

        {/* Row 2: Rules */}
        <FadeInCard delay={320} className="min-h-[180px]">
          <RulesCard />
        </FadeInCard>

        {/* Footer */}
        <FadeInCard delay={400}>
          <footer className="glass px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-slate-500">{tf('copyright')}</p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link
                href="/privacy"
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {tf('privacy')}
              </Link>
              {hasChampions && (
                <Link
                  href="/hall-of-fame"
                  className="text-slate-500 hover:text-amber-400 transition-colors"
                >
                  🏆 {tc('hallOfFame')}
                </Link>
              )}
              <a
                href={DEVELOPER_BSKY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-sky-400 transition-colors"
              >
                {tf('developer')} @Bluesky
              </a>
              <LanguageSwitcher currentLocale={locale as Locale} />
            </div>
          </footer>
        </FadeInCard>
      </section>
    </main>
  );
}
