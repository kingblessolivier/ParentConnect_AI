/**
 * Pure aggregation of ratings into a summary (FR-34). No I/O, so it's fully
 * unit-testable and safe: the output is anonymous (counts + mean only).
 */

import { MAX_STARS, MIN_STARS, type Rating, type RatingSummary } from './types.js';

export function summarise(itemId: string, ratings: readonly Rating[]): RatingSummary {
  const distribution: Record<number, number> = {};
  for (let s = MIN_STARS; s <= MAX_STARS; s += 1) distribution[s] = 0;

  let total = 0;
  for (const r of ratings) {
    distribution[r.stars] = (distribution[r.stars] ?? 0) + 1;
    total += r.stars;
  }
  const count = ratings.length;
  return {
    itemId,
    count,
    average: count === 0 ? null : Number((total / count).toFixed(2)),
    distribution,
  };
}
