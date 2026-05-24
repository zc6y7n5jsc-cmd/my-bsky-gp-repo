// クラス判定閾値（環境変数で上書き可能）
export const CLASS_THRESHOLDS = {
  Rookie: { min: 0, max: 99 },
  Rising: { min: 100, max: 499 },
  Challenger: { min: 500, max: 999 },
  Established: { min: 1000, max: 4999 },
  Influencer: { min: 5000, max: 9999 },
  Star: { min: 10000, max: Infinity },
} as const;

export type EntryClass = keyof typeof CLASS_THRESHOLDS;

export function determineClass(followers: number): EntryClass {
  for (const [className, { min, max }] of Object.entries(CLASS_THRESHOLDS)) {
    if (followers >= min && followers <= max) {
      return className as EntryClass;
    }
  }
  return 'Star';
}

// 勝負期間（日数）
export const RACE_DURATION_DAYS = 30;

// 開発者情報（後から差し替え可能）
export const DEVELOPER_BSKY_HANDLE = process.env.NEXT_PUBLIC_DEVELOPER_HANDLE ?? '@your-handle.bsky.social';
export const DEVELOPER_BSKY_URL = `https://bsky.app/profile/${DEVELOPER_BSKY_HANDLE}`;

// 公開 URL
// ローカル開発では 127.0.0.1 を使う（RFC 8252: localhost は AT Protocol OAuth で拒否される）
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bsky-gp.vercel.app';
// http:// で始まる場合はローカル環境と判定（127.0.0.1 / 本番は https://）
export const IS_LOCAL = SITE_URL.startsWith('http://');

// ハッシュタグ
export const HASHTAG = '#BSKY_GP';

// 寄付リンク
export const DONATION_LINKS = {
  buyMeACoffee: process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL ?? '',
  kofi: process.env.NEXT_PUBLIC_KOFI_URL ?? '',
};

// Cron の1回あたりの処理上限人数
export const CRON_BATCH_SIZE = 50;

// 参加者カウンター表示の最低閾値
export const PARTICIPANT_DISPLAY_THRESHOLD = 50;
