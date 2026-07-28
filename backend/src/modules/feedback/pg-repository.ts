/**
 * Postgres implementation of the feedback repository (ADR-0002). One rating per
 * (item, parent), enforced by a unique constraint + ON CONFLICT upsert.
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { FeedbackRepository } from './repository.js';
import type { Rating } from './types.js';

interface Row {
  id: string;
  item_id: string;
  parent_id: string;
  stars: number;
  comment: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

function mapRow(r: Row): Rating {
  return {
    id: r.id,
    itemId: r.item_id,
    parentId: r.parent_id,
    stars: r.stars,
    ...(r.comment ? { comment: r.comment } : {}),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export class PgFeedbackRepository implements FeedbackRepository {
  constructor(private readonly db: Queryable) {}

  async upsert(
    itemId: string,
    parentId: string,
    stars: number,
    comment: string | undefined,
    at: string,
  ): Promise<Rating> {
    const r = await this.db.query<Row>(
      `INSERT INTO content_ratings (id, item_id, parent_id, stars, comment, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$6)
       ON CONFLICT (item_id, parent_id)
       DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment, updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [randomUUID(), itemId, parentId, stars, comment ?? null, at],
    );
    return mapRow(r.rows[0]!);
  }

  async getForParent(itemId: string, parentId: string): Promise<Rating | null> {
    const r = await this.db.query<Row>(
      'SELECT * FROM content_ratings WHERE item_id = $1 AND parent_id = $2',
      [itemId, parentId],
    );
    return r.rows[0] ? mapRow(r.rows[0]) : null;
  }

  async listForItem(itemId: string): Promise<Rating[]> {
    const r = await this.db.query<Row>('SELECT * FROM content_ratings WHERE item_id = $1', [itemId]);
    return r.rows.map(mapRow);
  }

  async listAll(): Promise<Rating[]> {
    const r = await this.db.query<Row>('SELECT * FROM content_ratings');
    return r.rows.map(mapRow);
  }
}
