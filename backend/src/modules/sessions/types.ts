/**
 * Community-session domain types (FR-25–28). Sessions are led by CHWs/Parent
 * Champions; attendance is recorded (often offline) and linked to a parent's
 * profile so the in-person and digital channels reinforce each other.
 */

import type { ContentTopic } from '../content/types.js';

export type SessionTopic = ContentTopic;

export interface Session {
  id: string;
  facilitatorId: string;
  district: string;
  sector: string;
  topic: SessionTopic;
  scheduledAt: string;
  outcomeNotes?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  parentId: string;
  /** Device-generated id; makes offline replay idempotent (ADR-0008, NFR-07). */
  clientId: string;
  recordedAt: string;
}
