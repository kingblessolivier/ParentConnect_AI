/**
 * Shared types mirroring the backend API responses (backend/src/modules/*).
 * Kept deliberately small — only what the consoles render.
 */

export interface Overview {
  totalParents: number;
  activeByChannel: Record<string, number>;
  byLanguage: Record<string, number>;
  assessments: {
    baseline: number;
    followup: number;
    completedPairs: number;
    completionRate: number;
  };
  meanChange: {
    knowledge: number | null;
    confidence: number | null;
    communication: number | null;
  };
}

export type ReferralStatus = 'raised' | 'acknowledged' | 'actioned' | 'closed';
export type ReferralCategory = 'abuse' | 'exploitation' | 'self_harm' | 'pregnancy' | 'other';

export interface ReferralView {
  id: string;
  raisedByParentId: string;
  category: ReferralCategory;
  status: ReferralStatus;
  assignedOfficerId?: string;
  createdAt: string;
  dueBy: string;
  updatedAt: string;
  overdue: boolean;
}

export interface RatingSummary {
  itemId: string;
  count: number;
  average: number | null;
  distribution: Record<number, number>;
}

export type ContentStatus =
  | 'draft'
  | 'clinical_review'
  | 'cultural_review'
  | 'approved'
  | 'published'
  | 'retired';

export interface ReviewItem {
  versionId: string;
  itemId: string;
  version: number;
  status: ContentStatus;
  topic: string;
  ageBand: string;
  language: string;
  title: string;
  clinicalApprovedBy?: string;
  culturalApprovedBy?: string;
  createdAt: string;
}
