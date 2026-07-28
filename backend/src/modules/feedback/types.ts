/**
 * Content feedback & ratings (FR-34).
 *
 * A parent rates a PUBLISHED content module (1–5) and may leave a short
 * comment. Ratings carry only the anonymous parent id — never child identity
 * (NFR-15). One rating per parent per item (resubmitting updates it).
 */

export const MIN_STARS = 1;
export const MAX_STARS = 5;

export interface Rating {
  id: string;
  itemId: string;
  /** Anonymous parent id of the rater — never a child (NFR-15). */
  parentId: string;
  /** Integer 1–5. */
  stars: number;
  /** Optional short free-text comment (P1). */
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

/** Aggregate view of a single item's ratings (what admins see, FR-34). */
export interface RatingSummary {
  itemId: string;
  count: number;
  /** Mean stars to 2 d.p., or null when there are no ratings. */
  average: number | null;
  /** How many ratings fell on each star value (1..5). */
  distribution: Record<number, number>;
}
