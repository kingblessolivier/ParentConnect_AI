/**
 * Pure programme-overview computation (FR-30). Given parent dimensions and
 * assessment results, produce the headline indicators an admin sees at a
 * glance: reach, activity split by channel/language, assessment completion,
 * and overall mean knowledge/confidence/communication change.
 *
 * No I/O and no PII — only counts and means — so it's fully unit-testable and
 * safe to expose as an aggregate (NFR-10/19).
 */

import { deltaFor } from './indicators.js';
import type { AssessmentResult, ParentDims } from './types.js';

export interface Overview {
  totalParents: number;
  /** Count of parents by preferred delivery channel (app/sms/ussd/ivr). */
  activeByChannel: Record<string, number>;
  /** Count of parents by preferred language (rw/en/fr). */
  byLanguage: Record<string, number>;
  assessments: {
    baseline: number;
    followup: number;
    /** Parents with BOTH a baseline and a follow-up (a computable delta). */
    completedPairs: number;
    /** completedPairs / totalParents, 0–1 to 2 d.p. (0 when no parents). */
    completionRate: number;
  };
  /** Mean change among parents with a completed pair, or null. */
  meanChange: {
    knowledge: number | null;
    confidence: number | null;
    communication: number | null;
  };
}

function tally(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

export function computeOverview(
  parents: readonly ParentDims[],
  results: readonly AssessmentResult[],
): Overview {
  const totalParents = parents.length;
  const baseline = results.filter((r) => r.type === 'baseline').length;
  const followup = results.filter((r) => r.type === 'followup').length;

  const knowledge: number[] = [];
  const confidence: number[] = [];
  const communication: number[] = [];
  let completedPairs = 0;
  for (const parent of parents) {
    const delta = deltaFor(parent.id, results);
    if (delta.knowledge !== null && delta.confidence !== null && delta.communication !== null) {
      completedPairs += 1;
      knowledge.push(delta.knowledge);
      confidence.push(delta.confidence);
      communication.push(delta.communication);
    }
  }

  return {
    totalParents,
    activeByChannel: tally(parents.map((p) => p.preferredChannel)),
    byLanguage: tally(parents.map((p) => p.preferredLanguage)),
    assessments: {
      baseline,
      followup,
      completedPairs,
      completionRate: totalParents === 0 ? 0 : Number((completedPairs / totalParents).toFixed(2)),
    },
    meanChange: {
      knowledge: mean(knowledge),
      confidence: mean(confidence),
      communication: mean(communication),
    },
  };
}
