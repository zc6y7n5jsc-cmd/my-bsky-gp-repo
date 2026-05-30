import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSessionDid } from '@/src/lib/session';
import { getActiveEntry } from '@/src/lib/entries';
import { getAllEntriesForDid, getSnapshotsAsc } from '@/src/lib/player';
import { getRankAroundUser } from '@/src/lib/rankings';
import { fetchBlueskyProfile } from '@/src/lib/bluesky';
import { ClassBadge } from '@/app/components/ClassBadge';
import { FadeInCard } from '@/app/components/FadeInCard';
import { CountdownTimer } from './components/CountdownTimer';
import { MyChart } from './components/MyChart';
import { EntryHistory } from './components/EntryHistory';
import { ShareSection } from './components/ShareSection';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';
import { AutoSync } from './components/AutoSync';
import { MilestoneToast } from './components/MilestoneToast';
import { CompletionModal } from './components/CompletionModal';
import { AnimatedNumber } from './components/AnimatedNumber';
import { RegisterButton } from './components/RegisterButton';
import type { EntryClass } from '@/src/lib/constants';

export const metadata: Metadata = {
  title: 'My Page | BSKY-GP',
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface RankChip {
  label: string;
  rank: number | null;
}

function RankCard({ label, rank }: RankChip) {
  const medal = rank != null ? (RANK_MEDAL[rank] ?? '') : '';
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="stat-num text-amber-300 text-4xl font-black leading-tight" style={{ textShadow: '0 0 18px rgba(251,191,36,.4)' }}>
        {rank != null ? `${medal}#${rank}` : '--'}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const [did, t] = await Promise.all([
    getSessionDid(),
    getTranslations('myPage'),
  ]);
  if (!did) redirect('/login?redirect=/dashboard');

  const [entry, allEntries] = await Promise.all([
    getActiveEntry(did).catch(() => null),
    getAllEntriesForDid(did).catch(() => []),
  ]);

  const [snapshots, overallRankData, classRankData, profile] = await (async () => {
    if (!entry) return [[], { myRank: null, around: [] }, { myRank: null, around: [] }, null];
    return Promise.all([
      getSnapshotsAsc(entry.id, 30).catch(() => []),
      getRankAroundUser(did, 'all', 'daily').catch(() => ({ myRank: null, around: [] })),
      getRankAroundUser(did, entry.class as Parameters<typeof getRankAroundUser>[1], 'daily').catch(
        () => ({ myRank: null, around: [] }),
      ),
      fetchBlueskyProfile(did).catch(() => null),
    ]);
  })();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bsky-gp.vercel.app';
  const displayName = profile?.displayName || entry?.displayName || entry?.handle || did;
  const avatarUrl = profile?.avatar || entry?.avatar || null;
  const handle = profile?.handle || entry?.handle || '';

  const overallRank = overallRankData.myRank?.rank ?? null;
  const classRank = classRankData.myRank?.rank ?? null;

  const gain = entry?.maxMonthlyGain ?? 0;
  const currentFollowers = entry?.currentFollowers ?? entry?.baselineFollowers ?? 0;

  return (
    <main className="min-h-screen">
      {entry && <AutoSync did={did} />}

      {entry && !entry.isCompleted && (
        <MilestoneToast
          currentFollowers={currentFollowers}
          currentClass={entry.class as EntryClass}
        />
      )}

      {entry?.isCompleted && (
        <CompletionModal
          entryId={entry.id}
          gain={gain}
          rank={overallRank}
          cls={entry.class}
        />
      )}

      <div className="sticky top-0 z-10 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="neon-title font-black text-lg">
            BSKY-GP
          </Link>
          <div className="flex items-center gap-3">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={28}
                height={28}
                className="rounded-full ring-1 ring-white/20"
              />
            )}
            <span className="text-slate-400 text-sm hidden sm:block">@{handle}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

        {entry ? (
          <>
            <FadeInCard delay={0}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="glass glass-hover p-6 flex flex-col items-center text-center md:col-span-1">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={80}
                      height={80}
                      className="rounded-full ring-2 ring-sky-500/30 mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-3xl text-white mb-3">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <p className="text-white font-bold text-lg leading-tight">{displayName}</p>
                  <p className="text-slate-500 text-sm">@{handle}</p>
                  <div className="mt-3">
                    <ClassBadge cls={entry.class} pulse size="md" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-slate-500 text-xs mb-1">{t('currentFollowers')}</p>
                      <AnimatedNumber value={currentFollowers} className="text-white font-bold text-sm" />
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-slate-500 text-xs mb-1">{t('monthlyGain')}</p>
                      <AnimatedNumber value={gain} prefix="+" className="text-gain stat-num font-bold text-sm" />
                    </div>
                  </div>
                </div>

                <div className="glass glass-hover md:col-span-1 flex flex-col justify-around">
                  <div className="border-b border-white/5">
                    <RankCard label={t('overallRankLabel')} rank={overallRank} />
                  </div>
                  <RankCard label={t('classRankLabel', { class: entry.class })} rank={classRank} />
                </div>

                <div className="md:col-span-1 min-h-[200px]">
                  <CountdownTimer
                    endsAt={entry.endsAt.toISOString()}
                    isCompleted={entry.isCompleted}
                  />
                </div>
              </div>
            </FadeInCard>

            <FadeInCard delay={80} className="min-h-[300px]">
              <MyChart
                snapshots={snapshots.map((s) => ({
                  followersCount: s.followersCount,
                  capturedAt: s.capturedAt.toISOString(),
                }))}
                baselineFollowers={entry.baselineFollowers}
                startedAt={entry.startedAt.toISOString()}
                endsAt={entry.endsAt.toISOString()}
              />
            </FadeInCard>

            <FadeInCard delay={160}>
              <ShareSection
                did={did}
                handle={handle}
                siteUrl={siteUrl}
                card={{
                  displayName,
                  handle,
                  avatarUrl,
                  cls: entry.class,
                  gain,
                  overallRank,
                  classRank,
                  snapshots: snapshots.map((s) => ({ followersCount: s.followersCount })),
                  baseline: entry.baselineFollowers,
                  isCompleted: entry.isCompleted,
                }}
              />
            </FadeInCard>
          </>
        ) : (
          <FadeInCard delay={0}>
            <div className="glass p-8 text-center">
              <div className="text-5xl mb-4">🏁</div>
              <h2 className="text-white font-bold text-xl mb-2">{t('noEntry')}</h2>
              <p className="text-slate-400 text-sm mb-6">{t('noEntryDesc')}</p>
              <RegisterButton />
            </div>
          </FadeInCard>
        )}

        {allEntries.length > (entry ? 1 : 0) && (
          <FadeInCard delay={240}>
            <EntryHistory entries={allEntries} activeEntryId={entry?.id} />
          </FadeInCard>
        )}

        <FadeInCard delay={320}>
          <DeleteAccountDialog />
        </FadeInCard>
      </div>
    </main>
  );
}
