import { eq, and, gte } from 'drizzle-orm';
import { entries, snapshots } from './db-schema';
import { db } from './db-schema';

const Z_SCORE_THRESHOLD = 3;
// Need at least this many diffs to compute a reliable baseline.
// MIN_DIFFS baseline diffs + 1 latest diff = MIN_DIFFS + 2 snapshots.
const MIN_BASELINE_DIFFS = 3;

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function popStdDev(vals: number[], mu: number): number {
  const variance = vals.reduce((a, b) => a + (b - mu) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

/**
 * Examines the past-30-day snapshot series for an entry and flags it if
 * the most-recent inter-snapshot follower gain has a z-score > 3.
 *
 * Key design: baseline statistics (mean, std-dev) are computed from all
 * historical diffs *excluding* the latest one. This prevents the anomalous
 * value from inflating the mean/std-dev and masking itself.
 *
 * Returns true when the entry was newly flagged, false otherwise.
 * Errors are re-thrown so the caller can swallow them safely.
 */
export async function checkAndFlagIfAnomalous(entryId: number): Promise<boolean> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const snaps = await db
    .select({ followersCount: snapshots.followersCount })
    .from(snapshots)
    .where(and(eq(snapshots.entryId, entryId), gte(snapshots.capturedAt, thirtyDaysAgo)))
    .orderBy(snapshots.capturedAt);

  // Need MIN_BASELINE_DIFFS + 2 snapshots: MIN_BASELINE_DIFFS for the baseline
  // distribution + 1 boundary snapshot + 1 latest snapshot
  if (snaps.length < MIN_BASELINE_DIFFS + 2) return false;

  const diffs: number[] = [];
  for (let i = 1; i < snaps.length; i++) {
    diffs.push(snaps[i].followersCount - snaps[i - 1].followersCount);
  }

  const baseline = diffs.slice(0, -1); // historical diffs, excluding the latest
  const latest   = diffs.at(-1)!;

  const mu    = mean(baseline);
  const sigma = popStdDev(baseline, mu);

  // Follower counts are integers, so sigma < 1 means effectively zero variance
  // (all historical gains were identical). In that case skip the check to avoid
  // false positives from rounding noise.
  if (sigma < 1) return false;

  const zScore = (latest - mu) / sigma;

  if (zScore > Z_SCORE_THRESHOLD) {
    await db
      .update(entries)
      .set({ isFlagged: true })
      .where(eq(entries.id, entryId));
    return true;
  }

  return false;
}
