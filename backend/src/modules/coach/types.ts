/**
 * Coach types. The Node tier NEVER answers health questions itself — it calls
 * the Python AI/RAG service (ADR-0003/0014). These types are the internal
 * contract with that service plus the client-facing response.
 */

import type { AgeBand, Language } from '../identity/types.js';
import type { ReferralContact } from '../safeguarding/referral-directory.js';

export interface AiCoachRequest {
  question: string;
  language: Language;
  ageBand?: AgeBand;
}

export interface Citation {
  contentVersionId: string;
  title: string;
}

export type AiSafetyFlag = 'none' | 'crisis' | 'out_of_scope' | 'refused';

/** What the Python AI/RAG service returns (docs/ai/ai-architecture.md). */
export interface AiCoachResult {
  answer: string;
  citations: Citation[];
  safetyFlag: AiSafetyFlag;
  conversationStarters: string[];
}

export type CoachSafetyFlag = AiSafetyFlag | 'degraded';

/** What the parent's client receives. */
export interface CoachResponse {
  answer: string;
  /** Always true — the coach is disclosed as an AI (D4). */
  isAi: true;
  safetyFlag: CoachSafetyFlag;
  citations: Citation[];
  conversationStarters: string[];
  /** Referral contacts attached on crisis or when degraded (never gated by AI, NFR-06). */
  referral: ReferralContact[] | null;
  /** True when the AI was unavailable and this is a fallback response. */
  degraded: boolean;
  /** True when the question was queued to answer once the AI recovers. */
  queued: boolean;
}
