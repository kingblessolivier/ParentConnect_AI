import { describe, it, expect } from 'vitest';
import { computeOverview } from './overview.js';
import type { AssessmentResult, ParentDims } from './types.js';

function parent(id: string, over: Partial<ParentDims> = {}): ParentDims {
  return { id, preferredChannel: 'sms', preferredLanguage: 'rw', ...over };
}
function result(parentId: string, type: 'baseline' | 'followup', k: number, c: number, m: number): AssessmentResult {
  return { id: `${parentId}-${type}`, parentId, type, scores: { knowledge: k, confidence: c, communication: m }, completedAt: '2026-07-27T00:00:00Z' };
}

describe('computeOverview', () => {
  it('reports reach, channel/language splits, completion, and mean change', () => {
    const parents = [
      parent('p1', { preferredChannel: 'sms', preferredLanguage: 'rw' }),
      parent('p2', { preferredChannel: 'app', preferredLanguage: 'rw' }),
      parent('p3', { preferredChannel: 'sms', preferredLanguage: 'en' }),
    ];
    const results = [
      result('p1', 'baseline', 20, 20, 20), result('p1', 'followup', 60, 40, 30),
      result('p2', 'baseline', 50, 50, 50), result('p2', 'followup', 60, 70, 50),
      result('p3', 'baseline', 10, 10, 10), // no follow-up → not a completed pair
    ];
    const o = computeOverview(parents, results);
    expect(o.totalParents).toBe(3);
    expect(o.activeByChannel).toEqual({ sms: 2, app: 1 });
    expect(o.byLanguage).toEqual({ rw: 2, en: 1 });
    expect(o.assessments.baseline).toBe(3);
    expect(o.assessments.followup).toBe(2);
    expect(o.assessments.completedPairs).toBe(2);
    expect(o.assessments.completionRate).toBe(0.67); // 2/3
    expect(o.meanChange.knowledge).toBe(25); // (+40, +10)/2
    expect(o.meanChange.confidence).toBe(20); // (+20, +20)/2
  });

  it('is safe with no parents (no division by zero)', () => {
    const o = computeOverview([], []);
    expect(o.totalParents).toBe(0);
    expect(o.assessments.completionRate).toBe(0);
    expect(o.meanChange.knowledge).toBeNull();
    expect(o.activeByChannel).toEqual({});
  });
});
