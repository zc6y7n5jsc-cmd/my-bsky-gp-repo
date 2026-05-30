import type { Metadata } from 'next';
import { Geist, Geist_Mono, Russo_One, Chakra_Petch } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from '@/src/lib/auth-context';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bsky-gp.vercel.app';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

// Gaming display face — impact headings & the BSKY-GP wordmark
const russoOne = Russo_One({
  variable: '--font-display',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

// Techy tabular numerals for stats / scores
const chakraPetch = Chakra_Petch({
  variable: '--font-chakra',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'BSKY-GP | Bluesky Grand Prix',
    template: '%s | BSKY-GP',
  },
  description:
    '30日間でBlueskyのフォロワーをどれだけ増やせるかを競うグローバルコンペティション。Compete globally to grow your Bluesky followers in 30 days!',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    siteName: 'BSKY-GP',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ja':        SITE_URL,
      'en':        SITE_URL,
      'pt-BR':     SITE_URL,
      'zh-TW':     SITE_URL,
      'de':        SITE_URL,
      'fr':        SITE_URL,
      'x-default': SITE_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD 構造化データ
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'BSKY-GP',
  url: SITE_URL,
  description:
    '30日間でBlueskyのフォロワーをどれだけ増やせるかを競うグローバルコンペティション。',
  inLanguage: ['ja', 'en', 'pt-BR', 'zh-TW', 'de', 'fr'],
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/rankings`,
    'query-input': 'required name=search_term_string',
  },
};

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'BSKY-GP',
  url: SITE_URL,
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Web',
  description:
    'Compete globally to grow your Bluesky followers in 30 days!',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale   = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${russoOne.variable} ${chakraPetch.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col text-white">
        <div className="arena-bg" aria-hidden />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
