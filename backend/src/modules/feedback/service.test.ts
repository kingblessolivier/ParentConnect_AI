import { describe, it, expect, beforeEach } from 'vitest';
import type { ContentRepository } from '../content/repository.js';
import type { PublishedModule } from '../content/types.js';
import { InMemoryFeedbackRepository } from './repository.js';
import { FeedbackService } from './service.js';

/** A content lookup that treats a fixed set of item ids as published. */
function contentWith(publishedIds: string[]): Pick<ContentRepository, 'getPublishedModule'> {
  return {
    async getPublishedModule(itemId: string): Promise<PublishedModule | null> {
      return publishedIds.includes(itemId)
        ? ({ itemId, title: 't', body: 'b' } as PublishedModule)
        : null;
    },
  };
}

describe('FeedbackService.rate', () => {
  let repo: InMemoryFeedbackRepository;
  beforeEach(() => {
    repo = new InMemoryFeedbackRepository();
  });

  it('stores a rating for a published item', async () => {
    const service = new FeedbackService(repo, contentWith(['item-1']));
    const r = await service.rate('p1', 'item-1', { stars: 4, comment: 'clear and helpful' });
    expect(r.stars).toBe(4);
    expect(r.comment).toBe('clear and helpful');
  });

  it('404s a rating for content that is not published', async () => {
    const service = new FeedbackService(repo, contentWith([]));
    await expect(service.rate('p1', 'ghost', { stars: 5 })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects out-of-range or non-integer stars (400)', async () => {
    const service = new FeedbackService(repo, contentWith(['item-1']));
    await expect(service.rate('p1', 'item-1', { stars: 0 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.rate('p1', 'item-1', { stars: 6 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.rate('p1', 'item-1', { stars: 3.5 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.rate('p1', 'item-1', { stars: 'five' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an over-long comment (400)', async () => {
    const service = new FeedbackService(repo, contentWith(['item-1']));
    await expect(
      service.rate('p1', 'item-1', { stars: 3, comment: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('resubmitting updates the same rating (one per parent per item)', async () => {
    const service = new FeedbackService(repo, contentWith(['item-1']));
    await service.rate('p1', 'item-1', { stars: 2, comment: 'meh' });
    await service.rate('p1', 'item-1', { stars: 5 }); // comment cleared
    const mine = await service.myRating('p1', 'item-1');
    expect(mine?.stars).toBe(5);
    expect(mine?.comment).toBeUndefined();
    expect((await service.summaryForItem('item-1')).count).toBe(1);
  });
});

describe('FeedbackService aggregates', () => {
  it('summarises one item and lists its comments newest-first', async () => {
    const repo = new InMemoryFeedbackRepository();
    let clock = '2026-07-28T00:00:00.000Z';
    const service = new FeedbackService(repo, contentWith(['item-1']), () => clock);
    await service.rate('p1', 'item-1', { stars: 4, comment: 'first' });
    clock = '2026-07-28T01:00:00.000Z';
    await service.rate('p2', 'item-1', { stars: 5, comment: 'second' });
    await service.rate('p3', 'item-1', { stars: 3 }); // no comment

    const summary = await service.summaryForItem('item-1');
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(4);

    const comments = await service.commentsForItem('item-1');
    expect(comments.map((c) => c.comment)).toEqual(['second', 'first']);
  });

  it('produces per-item summaries across all rated content', async () => {
    const repo = new InMemoryFeedbackRepository();
    const service = new FeedbackService(repo, contentWith(['a', 'b']));
    await service.rate('p1', 'a', { stars: 5 });
    await service.rate('p2', 'a', { stars: 3 });
    await service.rate('p1', 'b', { stars: 4 });
    const all = await service.allSummaries();
    expect(all).toHaveLength(2);
    expect(all.find((s) => s.itemId === 'a')?.average).toBe(4);
    expect(all.find((s) => s.itemId === 'b')?.count).toBe(1);
  });
});
