/**
 * Illustrative sample data so the consoles render standalone (e.g. for review
 * or screenshots) when no live backend is configured. Clearly labelled as demo
 * in the UI. NONE of this is real: synthetic ids, no identity of any kind.
 */

import type { Overview, RatingSummary, ReferralView, ReviewItem } from './types';

export const SAMPLE_OVERVIEW: Overview = {
  totalParents: 1284,
  activeByChannel: { sms: 812, app: 361, ussd: 78, ivr: 33 },
  byLanguage: { rw: 1102, en: 168, fr: 14 },
  assessments: { baseline: 946, followup: 512, completedPairs: 498, completionRate: 0.39 },
  meanChange: { knowledge: 22.4, confidence: 18.1, communication: 15.7 },
};

const now = Date.now();
const iso = (offsetH: number) => new Date(now + offsetH * 3_600_000).toISOString();

export const SAMPLE_REFERRALS: ReferralView[] = [
  { id: 'r-1041', raisedByParentId: 'anon-8842', category: 'self_harm', status: 'raised', createdAt: iso(-6), dueBy: iso(42), updatedAt: iso(-6), overdue: false },
  { id: 'r-1039', raisedByParentId: 'anon-5521', category: 'abuse', status: 'acknowledged', assignedOfficerId: 'cpo-2', createdAt: iso(-30), dueBy: iso(-2), updatedAt: iso(-20), overdue: true },
  { id: 'r-1036', raisedByParentId: 'anon-7710', category: 'pregnancy', status: 'actioned', assignedOfficerId: 'cpo-1', createdAt: iso(-52), dueBy: iso(-4), updatedAt: iso(-10), overdue: true },
  { id: 'r-1030', raisedByParentId: 'anon-3390', category: 'exploitation', status: 'closed', assignedOfficerId: 'cpo-1', createdAt: iso(-120), dueBy: iso(-72), updatedAt: iso(-60), overdue: false },
  { id: 'r-1028', raisedByParentId: 'anon-9004', category: 'other', status: 'acknowledged', assignedOfficerId: 'cpo-2', createdAt: iso(-14), dueBy: iso(34), updatedAt: iso(-8), overdue: false },
];

export const SAMPLE_REVIEW: ReviewItem[] = [
  { versionId: 'v-2201', itemId: 'i-2201', version: 1, status: 'clinical_review', topic: 'srh', ageBand: '16_19', language: 'rw', title: 'Understanding menstruation', createdAt: iso(-40) },
  { versionId: 'v-2198', itemId: 'i-2198', version: 2, status: 'cultural_review', topic: 'consent', ageBand: '13_15', language: 'rw', title: 'Talking about boundaries', clinicalApprovedBy: 'reviewer-3', createdAt: iso(-64) },
  { versionId: 'v-2190', itemId: 'i-2190', version: 1, status: 'approved', topic: 'relationships', ageBand: 'all', language: 'en', title: 'Healthy relationships 101', clinicalApprovedBy: 'reviewer-3', culturalApprovedBy: 'reviewer-5', createdAt: iso(-88) },
  { versionId: 'v-2185', itemId: 'i-2185', version: 1, status: 'draft', topic: 'myths', ageBand: '13_15', language: 'rw', title: 'Common myths, answered', createdAt: iso(-12) },
];

export const SAMPLE_FEEDBACK: (RatingSummary & { title: string })[] = [
  { itemId: 'c-communication-1315', title: 'Talking about growing up (13–15)', count: 214, average: 4.5, distribution: { 1: 4, 2: 8, 3: 20, 4: 66, 5: 116 } },
  { itemId: 'c-consent-1012', title: 'What consent means (10–12)', count: 168, average: 4.2, distribution: { 1: 6, 2: 10, 3: 28, 4: 60, 5: 64 } },
  { itemId: 'c-srh-1619', title: 'Puberty & the body (16–19)', count: 141, average: 3.8, distribution: { 1: 9, 2: 18, 3: 34, 4: 40, 5: 40 } },
  { itemId: 'c-parenting-all', title: 'Positive parenting basics', count: 97, average: 4.6, distribution: { 1: 1, 2: 3, 3: 9, 4: 33, 5: 51 } },
];
