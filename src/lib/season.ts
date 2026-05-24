/**
 * シーズン番号を返す。
 * SEASON_START_DATE 環境変数（YYYY-MM-DD、UTC）を起点として
 * 1年ごとにインクリメントする。
 * 例: 2026-07-01 開始なら
 *   シーズン1 = 2026-07-01 〜 2027-06-30
 *   シーズン2 = 2027-07-01 〜 2028-06-30
 */
export function getCurrentSeason(): number {
  const raw = process.env.SEASON_START_DATE;
  if (!raw) return 1; // 未設定ならシーズン1

  const startDate = new Date(raw + 'T00:00:00Z');
  const now = new Date();

  if (now < startDate) return 1;

  // 開始日から何年経過したかをカウント
  const anniversary = new Date(startDate);
  let season = 1;
  while (true) {
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    if (anniversary > now) break;
    season++;
  }
  return season;
}

/** シーズンの終了日（次のシーズン開始日の前日 UTC 23:59:59）を返す */
export function getSeasonEndDate(season: number): Date {
  const raw = process.env.SEASON_START_DATE ?? '2026-07-01';
  const startDate = new Date(raw + 'T00:00:00Z');
  // シーズン season の終了 = シーズン(season+1)の開始の1秒前
  const nextStart = new Date(startDate);
  nextStart.setUTCFullYear(nextStart.getUTCFullYear() + season);
  nextStart.setUTCSeconds(nextStart.getUTCSeconds() - 1);
  return nextStart;
}
