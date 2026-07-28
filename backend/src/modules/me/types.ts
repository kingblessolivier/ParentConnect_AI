/**
 * Monitoring & Evaluation types (FR-29–32).
 *
 * Assessments measure a parent's knowledge, confidence, and self-reported
 * parent–adolescent communication (FR-29). Indicators are computed as
 * anonymised aggregates and disaggregated (FR-31); no individual-level data
 * leaves via the dashboard/export (NFR-10/19).
 */

import type { CaregiverGender, Channel, Language, UrbanRural } from '../identity/types.js';

export type AssessmentType = 'baseline' | 'followup';

export interface AssessmentScores {
  /** 0–100. Knowledge of adolescent development / SRH. */
  knowledge: number;
  /** 0–100. Confidence to hold the conversation. */
  confidence: number;
  /** 0–100. Self-reported parent–adolescent communication. */
  communication: number;
}

export interface AssessmentResult {
  id: string;
  parentId: string;
  type: AssessmentType;
  scores: AssessmentScores;
  completedAt: string;
}

/** Per-parent baseline→follow-up change (null when either is missing). */
export interface AssessmentDelta {
  knowledge: number | null;
  confidence: number | null;
  communication: number | null;
}

/** The dimensions any indicator can be disaggregated by (FR-31). */
export type Dimension = 'district' | 'sector' | 'urbanRural' | 'caregiverGender' | 'channel';

export interface IndicatorRow {
  /** The disaggregation bucket, e.g. a district name or 'urban'. */
  group: string;
  reach: number;
  /** Mean baseline→follow-up change among parents with both, or null. */
  knowledgeChange: number | null;
  confidenceChange: number | null;
  communicationChange: number | null;
}

/** Minimal parent projection the indicator engine needs (no PII). */
export interface ParentDims {
  id: string;
  district?: string;
  sector?: string;
  urbanRural?: UrbanRural;
  caregiverGender?: CaregiverGender;
  preferredChannel: Channel;
  preferredLanguage: Language;
}
