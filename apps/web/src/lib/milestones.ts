import { CLASS_THRESHOLDS, type EntryClass } from './constants';

const CLASS_ORDER: EntryClass[] = [
  'Rookie', 'Rising', 'Challenger', 'Established', 'Influencer', 'Star',
];

export interface NextMilestone {
  nextClass: EntryClass;
  needed: number;
  nextThreshold: number;
}

/**
 * Returns how many followers are needed to reach the next class, or null if
 * the user is already at the top class (Star) or has already surpassed the
 * next class threshold.
 *
 * currentFollowers — latest snapshot count (baseline + gain)
 * currentClass     — the class assigned at registration time
 */
export function getNextMilestone(
  currentFollowers: number,
  currentClass: EntryClass,
): NextMilestone | null {
  const idx = CLASS_ORDER.indexOf(currentClass);
  if (idx === -1 || idx >= CLASS_ORDER.length - 1) return null;

  const nextClass      = CLASS_ORDER[idx + 1];
  const nextThreshold  = CLASS_THRESHOLDS[nextClass].min;
  const needed         = nextThreshold - currentFollowers;

  if (needed <= 0) return null;

  return { nextClass, needed, nextThreshold };
}
