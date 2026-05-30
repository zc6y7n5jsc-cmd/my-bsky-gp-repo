import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getRankings } from '@/src/lib/rankings';
import { ClassBadge } from '../components/ClassBadge';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Ranking',
  description:
    'BSKY-GP リアルタイムランキング — 30日間フォロワー増加数トップ100。Bluesky Grand Prix 参加者の月間・週間・日間ゲインを掲載。',
  openGraph: {
    title: 'Ranking | BSKY-GP',
    description: 'Top 100 Bluesky follower growth rankings — updated hourly.',
  },
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default async function RankingsPage() {
  const [result, t, tc] = await Promise.all([
    getRankings('all', 'monthly', 1, 100).catch(() => ({
      rankings: [], total: 0, page: 1, pageSize: 100, lastUpdatedAt: null,
    })),
    getTranslations('ranking'),
    getTranslations('classes'),
  ]);

  const { rankings, total, lastUpdatedAt } = result;

  return (
    <main className="min-h-screen pb-16">
      {/* Nav */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="neon-title font-black text-lg">
            BSKY-GP
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400 text-sm">{t('title')}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-white">
              🏆 {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('monthly')} · {t('overall')} · Top {total.toLocaleString()}
            </p>
          </div>
          {lastUpdatedAt && (
            <p className="text-slate-600 text-xs">
              {t('lastUpdated')}: {lastUpdatedAt.toLocaleString()}
            </p>
          )}
        </div>

        {rankings.length === 0 ? (
          <div className="glass p-12 text-center text-slate-500">
            {t('noData')}
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-12">{t('rank')}</th>
                  <th className="px-4 py-3 text-left">{t('player')}</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">{t('class')}</th>
                  <th className="px-4 py-3 text-right">{t('gain')}</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((row) => (
                  <tr
                    key={row.did}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      row.rank <= 3 ? `rank-${row.rank}` : 'hover:bg-white/3'
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-base">
                        {RANK_MEDAL[row.rank] ?? (
                          <span className="text-slate-400 font-mono text-xs">
                            #{row.rank}
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Player */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/player/${encodeURIComponent(row.did)}`}
                        className="flex items-center gap-2.5 group"
                      >
                        {row.avatar ? (
                          <Image
                            src={row.avatar}
                            alt={row.displayName ?? row.handle}
                            width={32}
                            height={32}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium group-hover:text-sky-300 transition-colors truncate leading-tight">
                            {row.displayName ?? `@${row.handle}`}
                          </p>
                          <p className="text-slate-500 text-xs truncate">
                            @{row.handle}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Class */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <ClassBadge cls={row.class} />
                    </td>

                    {/* Gain */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-gain stat-num font-bold">
                        +{row.gain.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">
          {t('footerNotePre')}{' '}
          <Link href="/" className="text-sky-600 hover:text-sky-400">
            {t('topPageLink')}
          </Link>
          {t('footerNotePost')}
        </p>
      </div>
    </main>
  );
}
