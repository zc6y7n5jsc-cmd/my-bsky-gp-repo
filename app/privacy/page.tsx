import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default async function PrivacyPage() {
  const [t, tc] = await Promise.all([
    getTranslations('privacy'),
    getTranslations('common'),
  ]);

  return (
    <main className="min-h-screen pb-16">
      <div className="sticky top-0 z-10 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="neon-title font-black text-lg">
            BSKY-GP
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400 text-sm">{t('title')}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-white mb-8">{t('title')}</h1>

        <div className="glass p-6 sm:p-8 space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">{t('section1Title')}</h2>
            <p className="text-sm">{t('section1Body')}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-400 list-disc list-inside">
              <li>{t('section1Item1')}</li>
              <li>{t('section1Item2')}</li>
              <li>{t('section1Item3')}</li>
              <li>{t('section1Item4')}</li>
              <li>{t('section1Item5')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">{t('section2Title')}</h2>
            <p className="text-sm">{t('dataUse')}</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">{t('section3Title')}</h2>
            <p className="text-sm">{t('section3Body')}</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">{t('section4Title')}</h2>
            <p className="text-sm">{t('section4Body')}</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">{t('section5Title')}</h2>
            <p className="text-sm">{t('section5Body')}</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">{t('section6Title')}</h2>
            <p className="text-sm">{t('section6Body')}</p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sky-500 hover:text-sky-400 text-sm transition-colors"
          >
            ← {tc('backToTop')}
          </Link>
        </div>
      </div>
    </main>
  );
}
