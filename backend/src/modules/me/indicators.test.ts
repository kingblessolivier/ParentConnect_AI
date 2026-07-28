import { describe, it, expect } from 'vitest';
import { computeIndicators, deltaFor, indicatorsToCsv } from './indicators.js';
import type { AssessmentResult, ParentDims } from './types.js';

function parent(id: string, over: Partial<ParentDims> = {}): ParentDims {
  return { id, preferredChannel: 'sms', preferredLanguage: 'rw', ...over };
}
function result(parentId: string, type: 'baseline' | 'followup', k: number, c: number, m: number): AssessmentResult {
  return { id: `${parentId}-${type}`, parentId, type, scores: { knowledge: k, confidence: c, communication: m }, completedAt: '2026-07-27T00:00:00Z' };
}

describe('deltaFor', () => {
  it('computes baseline→follow-up change', () => {
    const rs = [result('p1', 'baseline', 30, 40, 20), result('p1', 'followup', 70, 65, 50)];
    expect(deltaFor('p1', rs)).toEqual({ knowledge: 40, confidence: 25, communication: 30 });
  });
  it('is null when either assessment is missing', () => {
    expect(deltaFor('p1', [result('p1', 'baseline', 30, 40, 20)])).toEqual({
      knowledge: null, confidence: null, communication: null,
    });
  });
});

describe('computeIndicators', () => {
  it('disaggregates reach and mean change by dimension', () => {
    const parents = [
      parent('p1', { district: 'Gasabo' }),
      parent('p2', { district: 'Gasabo' }),
      parent('p3', { district: 'Nyarugenge' }),
    ];
    const results = [
      result('p1', 'baseline', 20, 20, 20), result('p1', 'followup', 60, 40, 30),
      result('p2', 'baseline', 50, 50, 50), result('p2', 'followup', 60, 70, 50),
    ];
    const rows = computeIndicators(parents, results, 'district');
    const gasabo = rows.find((r) => r.group === 'Gasabo')!;
    expect(gasabo.reach).toBe(2);
    expect(gasabo.knowledgeChange).toBe(25); // mean of +40 and +10
    const nyaru = rows.find((r) => r.group === 'Nyarugenge')!;
    expect(nyaru.reach).toBe(1);
    expect(nyaru.knowledgeChange).toBeNull(); // no completed pair
  });

  it('buckets unspecified dimensions', () => {
    const rows = computeIndicators([parent('p1')], [], 'district');
    expect(rows[0]?.group).toBe('(unspecified)');
    expect(rows[0]?.reach).toBe(1);
  });
});

describe('indicatorsToCsv', () => {
  it('renders a header and rows, blanks for null, escapes commas', () => {
    const csv = indicatorsToCsv('district', [
      { group: 'Gasabo', reach: 2, knowledgeChange: 25, confidenceChange: null, communicationChange: 10 },
      { group: 'Ki, gali', reach: 1, knowledgeChange: null, confidenceChange: null, communicationChange: null },
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('district,reach,knowledge_change,confidence_change,communication_change');
    expect(lines[1]).toBe('Gasabo,2,25,,10');
    expect(lines[2]).toBe('"Ki, gali",1,,,');
  });
});
