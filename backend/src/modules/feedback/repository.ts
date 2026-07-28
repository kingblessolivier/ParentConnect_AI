/**
 * Feedback repository (FR-34): interface + in-memory implementation.
 * One rating per (item, parent) — resubmitting updates the existing row.
 */

import { randomUUID } from 'node:crypto';
import type { Rating } from './types.js';

export interface FeedbackRepository {
  upsert(itemId: string, parentId: string, stars: number, comment: string | undefined, at: string): Promise<Rating>;
  getForParent(itemId: string, parentId: string): Promise<Rating | null>;
  listForItem(itemId: string): Promise<Rating[]>;
  /** All ratings a parent has left (data-subject export, NFR-17). */
  listForParent(parentId: string): Promise<Rating[]>;
  listAll(): Promise<Rating[]>;
}

export class InMemoryFeedbackRepository implements FeedbackRepository {
  private readonly items: Rating[] = [];

  async upsert(
    itemId: string,
    parentId: string,
    stars: number,
    comment: string | undefined,
    at: string,
  ): Promise<Rating> {
    const existing = this.items.find((r) => r.itemId === itemId && r.parentId === parentId);
    if (existing) {
      existing.stars = stars;
      if (comment === undefined) delete existing.comment;
      else existing.comment = comment;
      existing.updatedAt = at;
      return existing;
    }
    const rating: Rating = {
      id: randomUUID(),
      itemId,
      parentId,
      stars,
      ...(comment !== undefined ? { comment } : {}),
      createdAt: at,
      updatedAt: at,
    };
    this.items.push(rating);
    return rating;
  }

  async getForParent(itemId: string, parentId: string): Promise<Rating | null> {
    return this.items.find((r) => r.itemId === itemId && r.parentId === parentId) ?? null;
  }

  async listForItem(itemId: string): Promise<Rating[]> {
    return this.items.filter((r) => r.itemId === itemId);
  }

  async listForParent(parentId: string): Promise<Rating[]> {
    return this.items.filter((r) => r.parentId === parentId);
  }

  async listAll(): Promise<Rating[]> {
    return [...this.items];
  }
}
