/**
 * Postgres implementation of the assessment repository (ADR-0002).
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { AssessmentRepository } from './repository.js';
import type { AssessmentResult, AssessmentScores, AssessmentType } from './types.js';

interface Row {
  id: string;
  parent_id: string;
  type: AssessmentType;
  knowledge: number;
  confidence: number;
  communication: number;
  completed_at: Date | string;
}

function mapRow(r: Row): AssessmentResult {
  return {
    id: r.id,
    parentId: r.parent_id,
    type: r.type,
    scores: { knowledge: r.knowledge, confidence: r.confidence, communication: r.communication },
    completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : new Date(r.completed_at).toISOString(),
  };
}

export class PgAssessmentRepository implements AssessmentRepository {
  constructor(private readonly db: Queryable) {}

  async upsert(
    parentId: string,
    type: AssessmentType,
    scores: AssessmentScores,
  ): Promise<AssessmentResult> {
    const r = await this.db.query<Row>(
      `INSERT INTO assessments (id, parent_id, type, knowledge, confidence, communication, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (parent_id, type)
       DO UPDATE SET knowledge = EXCLUDED.knowledge, confidence = EXCLUDED.confidence,
                     communication = EXCLUDED.communication, completed_at = EXCLUDED.completed_at
       RETURNING *`,
      [randomUUID(), parentId, type, scores.knowledge, scores.confidence, scores.communication, new Date().toISOString()],
    );
    return mapRow(r.rows[0]!);
  }

  async listForParent(parentId: string): Promise<AssessmentResult[]> {
    const r = await this.db.query<Row>('SELECT * FROM assessments WHERE parent_id = $1', [parentId]);
    return r.rows.map(mapRow);
  }

  async listAll(): Promise<AssessmentResult[]> {
    const r = await this.db.query<Row>('SELECT * FROM assessments');
    return r.rows.map(mapRow);
  }
}
