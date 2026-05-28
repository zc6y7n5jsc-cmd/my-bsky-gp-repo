import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLatestEntryForDid, getSnapshotsAsc } from '@/src/lib/player';
import { getRankAroundUser } from '@/src/lib/rankings';
import { ClassBadge } from '@/app/components/ClassBadge';
import { FadeInCard } from '@/app/components/FadeInCard';
import { PlayerChart } from './components/PlayerChart';

export const revalidate = 3600;

interface Props {
  params: Promise<{ did: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { did } = await params;
  const decoded = decodeURIComponent(did);
  const entry = await getLatestEntryForDid(decoded).catch(() => null);
  if (!entry) return { title: 'Player not found | BSKY-GP' };

  const name = entry.displayName || `@${entry.handle}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bsky-gp.vercel.app';
  const ogUrl = `${siteUrl}/api/og/player/${did}`;

  return {
    title: `${name} | BSKY-GP`,
    description: `${name} — BSKY-GP 30-day follower growth challenge.`,
    openGraph: {
      title: `${name} | BSKY-GP`,
      description: `${name} — Max gain: +${entry.maxMonthlyGain ?? 0}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${name} | BSKY-GP` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | BSKY-GP`,
      images: [ogUrl],
    },
  };
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default async function PlayerPage({ params }: Props) {
  const { did } = await params;
  const decoded = decodeURIComponent(did);

  const [entry, rankData, t] = await Promise.all([
    getLatestEntryForDid(decoded).catch(() => null),
    getRankAroundUser(decoded, 'all', 'daily').catch(() => ({ myRank: null, around: [] })),
    getTranslations('player'),
  ]);

  if (!entry) notFound();

  const snapshots = await getSnapshotsAsc(entry.id, 30).catch(() => []);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bsky-gp.vercel.app';
  const overallRank = rankData.myRank?.rank ?? null;
  const gain = entry.maxMonthlyGain ?? 0;
  const status = entry.isCompleted ? t('completed') : t('racing');
  const bskyProfileUrl = `https://bsky.app/profile/${entry.handle}`;
  const playerUrl = `${siteUrl}/player/${encodeURIComponent(did)}`;
  const shareText = encodeURIComponent(
    t('blueskyShareText', {
      name: entry.displayName || entry.handle,
      url: playerUrl,
    }),
  );

  return (
    <main className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-sky-400 font-black text-lg hover:text-sky-300 transition-colors">
            BSKY-GP
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-500 text-sm truncate">
            @{entry.handle}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        <FadeInCard delay={0}>
          <div className="glass glass-hover p-6">
            <div className="flex items-start gap-5">
              {entry.avatar ? (
                <Image
                  src={entry.avatar}
                  alt={entry.displayName ?? entry.handle}
                  width={88}
                  height={88}
                  className="rounded-full ring-2 ring-sky-500/30 flex-shrink-0"
                />
              ) : (
                <div className="w-22 h-22 rounded-full bg-slate-700 flex items-center justify-center text-3xl text-white flex-shrink-0 w-[88px] h-[88px]">
                  {(entry.displayName || entry.handle)[0]?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-white font-bold text-2xl leading-tight">
                    {entry.displayName || `@${entry.handle}`}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.isCompleted
                        ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <a
                  href={bskyProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 text-sm hover:text-sky-400 transition-colors"
                >
                  @{entry.handle} ↗
                </a>

                <div className="flex flex-wrap gap-2 mt-3">
                  <ClassBadge cls={entry.class} pulse={!entry.isCompleted} size="md" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">{t('overallRank')}</p>
                <p className="text-amber-300 font-black text-xl">
                  {overallRank != null
                    ? `${RANK_MEDAL[overallRank] ?? ''}#${overallRank}`
                    : '--'}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">{t('monthlyGain')}</p>
                <p className="text-emerald-400 font-black text-xl">+{gain.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">{t('currentFollowers')}</p>
                <p className="text-white font-bold text-xl">
                  {(entry.currentFollowers ?? entry.baselineFollowers).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">{t('season')}</p>
                <p className="text-white font-bold text-xl">S{entry.season}</p>
              </div>
            </div>
          </div>
        </FadeInCard>

        <FadeInCard delay={80}>
          <div className="glass glass-hover p-5">
            <h2 className="font-bold text-white text-base mb-4">📈 {t('chartHeading')}</h2>
            <PlayerChart
              snapshots={snapshots.map((s) => ({
                followersCount: s.followersCount,
                capturedAt: s.capturedAt.toISOString(),
              }))}
              baselineFollowers={entry.baselineFollowers}
            />
          </div>
        </FadeInCard>

        <FadeInCard delay={160}>
          <div className="glass glass-hover p-5">
            <h2 className="font-bold text-white text-base mb-3">🔗 {t('shareHeading')}</h2>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://bsky.app/intent/compose?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-all"
              >
                🦋 {t('shareOnBluesky')}
              </a>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/8 transition-all"
              >
                🏆 {t('viewRanking')}
              </Link>
            </div>
          </div>
        </FadeInCard>
      </div>
    </main>
  );
}
