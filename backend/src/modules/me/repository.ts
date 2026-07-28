/**
 * Assessment repository (FR-29): interface + in-memory implementation.
 * Submitting the same type twice for a parent replaces the prior result.
 */

import { randomUUID } from 'node:crypto';
import type { AssessmentResult, AssessmentScores, AssessmentType } from './types.js';

export interface AssessmentRepository {
  upsert(parentId: string, type: AssessmentType, scores: AssessmentScores): Promise<AssessmentResult>;
  listForParent(parentId: string): Promise<AssessmentResult[]>;
  listAll(): Promise<AssessmentResult[]>;
}

export class InMemoryAssessmentRepository implements AssessmentRepository {
  private readonly items: AssessmentResult[] = [];

  async upsert(
    parentId: string,
    type: AssessmentType,
    scores: AssessmentScores,
  ): Promise<AssessmentResult> {
    const existing = this.items.find((r) => r.parentId === parentId && r.type === type);
    if (existing) {
      existing.scores = scores;
      existing.completedAt = new Date().toISOString();
      return existing;
    }
    const result: AssessmentResult = {
      id: randomUUID(),
      parentId,
      type,
      scores,
      completedAt: new Date().toISOString(),
    };
    this.items.push(result);
    return result;
  }

  async listForParent(parentId: string): Promise<AssessmentResult[]> {
    return this.items.filter((r) => r.parentId === parentId);
  }

  async listAll(): Promise<AssessmentResult[]> {
    return [...this.items];
  }
}
