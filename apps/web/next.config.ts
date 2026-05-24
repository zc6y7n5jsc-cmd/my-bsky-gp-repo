import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.bsky.app',
      },
      {
        protocol: 'https',
        hostname: '*.bsky.network',
      },
    ],
  },
  // @bsky-gp/db はローカルワークスペースパッケージのため transpile が必要
  transpilePackages: ['@bsky-gp/db'],
};

export default withNextIntl(nextConfig);
