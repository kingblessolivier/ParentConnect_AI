/**
 * Pure indicator computation (FR-30/31). Given parent dimensions and their
 * assessment results, produce disaggregated indicator rows. No I/O, no PII —
 * only counts and mean changes, so it's fully unit-testable and safe to expose.
 */

import type {
  AssessmentDelta,
  AssessmentResult,
  Dimension,
  IndicatorRow,
  ParentDims,
} from './types.js';

const UNSPECIFIED = '(unspecified)';

function dimensionValue(parent: ParentDims, dim: Dimension): string {
  // 'channel' disaggregates by the parent's preferred delivery channel.
  const value = dim === 'channel' ? parent.preferredChannel : parent[dim];
  return value && String(value).trim() !== '' ? String(value) : UNSPECIFIED;
}

/** Baseline→follow-up delta for one parent (null components when data missing). */
export function deltaFor(parentId: string, results: readonly AssessmentResult[]): AssessmentDelta {
  const baseline = results.find((r) => r.parentId === parentId && r.type === 'baseline');
  const followup = results.find((r) => r.parentId === parentId && r.type === 'followup');
  const diff = (key: keyof AssessmentResult['scores']): number | null =>
    baseline && followup ? followup.scores[key] - baseline.scores[key] : null;
  return {
    knowledge: diff('knowledge'),
    confidence: diff('confidence'),
    communication: diff('communication'),
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

export function computeIndicators(
  parents: readonly ParentDims[],
  results: readonly AssessmentResult[],
  dimension: Dimension,
): IndicatorRow[] {
  const buckets = new Map<
    string,
    { reach: number; knowledge: number[]; confidence: number[]; communication: number[] }
  >();

  for (const parent of parents) {
    const key = dimensionValue(parent, dimension);
    const bucket =
      buckets.get(key) ?? { reach: 0, knowledge: [], confidence: [], communication: [] };
    bucket.reach += 1;
    const delta = deltaFor(parent.id, results);
    if (delta.knowledge !== null) bucket.knowledge.push(delta.knowledge);
    if (delta.confidence !== null) bucket.confidence.push(delta.confidence);
    if (delta.communication !== null) bucket.communication.push(delta.communication);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([group, b]) => ({
      group,
      reach: b.reach,
      knowledgeChange: mean(b.knowledge),
      confidenceChange: mean(b.confidence),
      communicationChange: mean(b.communication),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

/** Serialise indicator rows to CSV (FR-32). Values are aggregate/anonymised. */
export function indicatorsToCsv(dimension: Dimension, rows: readonly IndicatorRow[]): string {
  const header = [
    dimension,
    'reach',
    'knowledge_change',
    'confidence_change',
    'communication_change',
  ];
  const escape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const cell = (n: number | null): string => (n === null ? '' : String(n));
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        escape(r.group),
        String(r.reach),
        cell(r.knowledgeChange),
        cell(r.confidenceChange),
        cell(r.communicationChange),
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}
