/**
 * M&E service (FR-29–32): submit assessments, compute a parent's own delta,
 * and produce disaggregated aggregate indicators + CSV export.
 */

import { AppError } from '../../lib/problem.js';
import type { ParentRepository } from '../identity/repository.js';
import type { ParentProfile } from '../identity/types.js';
import { computeIndicators, deltaFor, indicatorsToCsv } from './indicators.js';
import { computeOverview, type Overview } from './overview.js';
import type { AssessmentRepository } from './repository.js';
import type {
  AssessmentDelta,
  AssessmentResult,
  AssessmentScores,
  AssessmentType,
  Dimension,
  IndicatorRow,
  ParentDims,
} from './types.js';

const DIMENSIONS: readonly Dimension[] = [
  'district',
  'sector',
  'urbanRural',
  'caregiverGender',
  'channel',
];

function toDims(p: ParentProfile): ParentDims {
  const d: ParentDims = {
    id: p.id,
    preferredChannel: p.preferredChannel,
    preferredLanguage: p.preferredLanguage,
  };
  if (p.district !== undefined) d.district = p.district;
  if (p.sector !== undefined) d.sector = p.sector;
  if (p.urbanRural !== undefined) d.urbanRural = p.urbanRural;
  if (p.caregiverGender !== undefined) d.caregiverGender = p.caregiverGender;
  return d;
}

function validateScores(raw: unknown): AssessmentScores {
  if (typeof raw !== 'object' || raw === null) throw new AppError(400, 'Invalid input', 'scores required');
  const s = raw as Record<string, unknown>;
  const one = (key: string): number => {
    const v = s[key];
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) {
      throw new AppError(400, 'Invalid input', `${key} must be a number 0–100`);
    }
    return v;
  };
  return { knowledge: one('knowledge'), confidence: one('confidence'), communication: one('communication') };
}

export function parseDimension(value: unknown): Dimension {
  if (!DIMENSIONS.includes(value as Dimension)) {
    throw new AppError(400, 'Invalid input', `by must be one of ${DIMENSIONS.join(', ')}`);
  }
  return value as Dimension;
}

export class MeService {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly parents: ParentRepository,
  ) {}

  async submit(parentId: string, type: AssessmentType, rawScores: unknown): Promise<AssessmentResult> {
    if (type !== 'baseline' && type !== 'followup') {
      throw new AppError(400, 'Invalid input', "type must be 'baseline' or 'followup'");
    }
    return this.assessments.upsert(parentId, type, validateScores(rawScores));
  }

  async parentReport(parentId: string): Promise<{ results: AssessmentResult[]; delta: AssessmentDelta }> {
    const results = await this.assessments.listForParent(parentId);
    return { results, delta: deltaFor(parentId, results) };
  }

  async indicators(dimension: Dimension): Promise<IndicatorRow[]> {
    const [parents, results] = await Promise.all([
      this.parents.listAll(),
      this.assessments.listAll(),
    ]);
    return computeIndicators(parents.map(toDims), results, dimension);
  }

  async indicatorsCsv(dimension: Dimension): Promise<string> {
    return indicatorsToCsv(dimension, await this.indicators(dimension));
  }

  /** Consolidated headline indicators for the admin overview (FR-30). */
  async overview(): Promise<Overview> {
    const [parents, results] = await Promise.all([
      this.parents.listAll(),
      this.assessments.listAll(),
    ]);
    return computeOverview(parents.map(toDims), results);
  }
}
