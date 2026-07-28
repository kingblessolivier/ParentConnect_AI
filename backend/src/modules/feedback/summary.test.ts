import { describe, it, expect } from 'vitest';
import { summarise } from './summary.js';
import type { Rating } from './types.js';

function rating(stars: number, comment?: string): Rating {
  return {
    id: `r-${Math.random()}`,
    itemId: 'item-1',
    parentId: `p-${Math.random()}`,
    stars,
    ...(comment ? { comment } : {}),
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
  };
}

describe('summarise', () => {
  it('returns count, mean, and a full 1..5 distribution', () => {
    const s = summarise('item-1', [rating(5), rating(4), rating(4), rating(2)]);
    expect(s.count).toBe(4);
    expect(s.average).toBe(3.75);
    expect(s.distribution).toEqual({ 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 });
  });

  it('is null-averaged and zero-filled with no ratings', () => {
    const s = summarise('item-1', []);
    expect(s.count).toBe(0);
    expect(s.average).toBeNull();
    expect(s.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it('rounds the mean to 2 d.p.', () => {
    expect(summarise('item-1', [rating(5), rating(4), rating(4)]).average).toBe(4.33);
  });
});
