/**
 * Content domain types. Mirrors data-model.md (CONTENT_ITEM / CONTENT_VERSION)
 * and knowledge-base-spec.md.
 *
 * The invariant that matters: only a `published` version is ever served to a
 * parent (FR-20). Every version carries audio (FR-19) for low-literacy users.
 */

import type { AgeBand, Language } from '../identity/types.js';

export type ContentTopic =
  | 'puberty_development'
  | 'relationships'
  | 'consent'
  | 'srh'
  | 'communication'
  | 'positive_parenting'
  | 'safeguarding'
  | 'myths';

export type ContentStatus =
  | 'draft'
  | 'clinical_review'
  | 'cultural_review'
  | 'approved'
  | 'published'
  | 'retired';

export const CONTENT_TOPICS: readonly ContentTopic[] = [
  'puberty_development',
  'relationships',
  'consent',
  'srh',
  'communication',
  'positive_parenting',
  'safeguarding',
  'myths',
];

export interface ContentItem {
  id: string;
  topic: ContentTopic;
  ageBand: AgeBand | 'all';
  language: Language;
  createdAt: string;
}

export interface ContentVersion {
  id: string;
  itemId: string;
  version: number;
  status: ContentStatus;
  title: string;
  body: string;
  /** Audio for low-literacy users (FR-19/NFR-26). */
  audioUri?: string;
  illustrationUris: string[];
  clinicalApprovedBy?: string;
  culturalApprovedBy?: string;
  publishedAt?: string;
  createdAt: string;
}

/** A published module as served to a parent (item + its published version). */
export interface PublishedModule {
  itemId: string;
  versionId: string;
  topic: ContentTopic;
  ageBand: AgeBand | 'all';
  language: Language;
  title: string;
  body: string;
  audioUri: string | null;
  illustrationUris: string[];
}
