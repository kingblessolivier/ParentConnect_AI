/**
 * Illustrative sample data so the consoles render standalone (e.g. for review
 * or screenshots) when no live backend is configured. Clearly labelled as demo
 * in the UI. NONE of this is real: synthetic ids, no identity of any kind.
 */

import type { AdminUser, AuditEvent, DirectoryAdminView, Dimension, IndicatorRow, Overview, RatingSummary, ReferralView, ReviewItem } from './types';

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

export const SAMPLE_INDICATORS: Record<Dimension, IndicatorRow[]> = {
  district: [
    { group: 'Gasabo', reach: 412, knowledgeChange: 24.1, confidenceChange: 19.5, communicationChange: 16.8 },
    { group: 'Musanze', reach: 288, knowledgeChange: 20.6, confidenceChange: 17.2, communicationChange: 14.1 },
    { group: 'Nyagatare', reach: 201, knowledgeChange: 18.4, confidenceChange: 15.9, communicationChange: 12.0 },
    { group: '(unspecified)', reach: 383, knowledgeChange: 21.0, confidenceChange: 16.4, communicationChange: 13.9 },
  ],
  sector: [
    { group: 'Kimironko', reach: 156, knowledgeChange: 25.3, confidenceChange: 20.1, communicationChange: 17.4 },
    { group: 'Muhoza', reach: 132, knowledgeChange: 19.8, confidenceChange: 16.5, communicationChange: 13.2 },
    { group: '(unspecified)', reach: 996, knowledgeChange: 21.9, confidenceChange: 17.8, communicationChange: 14.9 },
  ],
  urbanRural: [
    { group: 'urban', reach: 498, knowledgeChange: 23.7, confidenceChange: 19.0, communicationChange: 16.2 },
    { group: 'rural', reach: 786, knowledgeChange: 19.9, confidenceChange: 16.6, communicationChange: 13.4 },
  ],
  caregiverGender: [
    { group: 'female', reach: 902, knowledgeChange: 22.6, confidenceChange: 18.4, communicationChange: 15.5 },
    { group: 'male', reach: 341, knowledgeChange: 20.1, confidenceChange: 16.9, communicationChange: 14.0 },
    { group: '(unspecified)', reach: 41, knowledgeChange: 17.5, confidenceChange: 14.2, communicationChange: 11.8 },
  ],
  channel: [
    { group: 'sms', reach: 812, knowledgeChange: 20.5, confidenceChange: 16.8, communicationChange: 13.9 },
    { group: 'app', reach: 361, knowledgeChange: 26.2, confidenceChange: 21.4, communicationChange: 18.6 },
    { group: 'ussd', reach: 78, knowledgeChange: 18.0, confidenceChange: 14.9, communicationChange: 11.5 },
    { group: 'ivr', reach: 33, knowledgeChange: 16.4, confidenceChange: 13.1, communicationChange: 10.2 },
  ],
};

export const SAMPLE_USERS: AdminUser[] = [
  { id: 'u-9001', role: 'admin', displayAlias: 'Grace', district: 'Gasabo', sector: null, preferredLanguage: 'en', preferredChannel: 'app', createdAt: iso(-4000) },
  { id: 'u-9002', role: 'cpo', displayAlias: 'Habimana', district: 'Musanze', sector: null, preferredLanguage: 'rw', preferredChannel: 'app', createdAt: iso(-3200) },
  { id: 'u-9003', role: 'reviewer', displayAlias: 'Dr. Uwase', district: null, sector: null, preferredLanguage: 'en', preferredChannel: 'app', createdAt: iso(-2800) },
  { id: 'u-9004', role: 'chw', displayAlias: 'Claudine', district: 'Nyagatare', sector: 'Karangazi', preferredLanguage: 'rw', preferredChannel: 'app', createdAt: iso(-2100) },
  { id: 'u-9005', role: 'champion', displayAlias: 'Emmanuel', district: 'Gasabo', sector: 'Kimironko', preferredLanguage: 'rw', preferredChannel: 'sms', createdAt: iso(-1500) },
  { id: 'u-9006', role: 'parent', displayAlias: null, district: 'Gasabo', sector: 'Kimironko', preferredLanguage: 'rw', preferredChannel: 'sms', createdAt: iso(-900) },
  { id: 'u-9007', role: 'parent', displayAlias: null, district: 'Musanze', sector: null, preferredLanguage: 'rw', preferredChannel: 'ussd', createdAt: iso(-300) },
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

export const SAMPLE_AUDIT: AuditEvent[] = [
  { id: 'a-9', actorId: 'u-9001', actorRole: 'admin', action: 'user.role_changed', entity: 'user', entityId: 'u-9004', at: iso(-2), metadata: { from: 'parent', to: 'chw' } },
  { id: 'a-8', actorId: 'u-9002', actorRole: 'cpo', action: 'referral.transitioned', entity: 'referral', entityId: 'r-1039', at: iso(-6), metadata: { to: 'acknowledged' } },
  { id: 'a-7', actorId: 'u-9003', actorRole: 'reviewer', action: 'content.transitioned', entity: 'content_version', entityId: 'v-2201', at: iso(-20), metadata: { to: 'cultural_review' } },
  { id: 'a-6', actorId: 'system:retention', actorRole: 'admin', action: 'retention.applied', entity: 'retention', entityId: 'run-2026-08-12', at: iso(-24), metadata: { otp: '14' } },
  { id: 'a-5', actorId: 'u-9001', actorRole: 'admin', action: 'referral_directory.updated', entity: 'referral_directory', entityId: 'd-3', at: iso(-30), metadata: { change: 'updated' } },
  { id: 'a-4', actorId: 'u-9006', actorRole: 'parent', action: 'privacy.erased', entity: 'account', entityId: 'u-9006', at: iso(-48) },
];

export const SAMPLE_DIRECTORY: DirectoryAdminView = {
  usingBaseline: false,
  baseline: [
    { name: 'Isange One Stop Centre', phone: '[VERIFY: per-district number]', type: 'one_stop_centre' },
    { name: 'National Child Helpline', phone: '[VERIFY: national helpline]', type: 'child_helpline' },
  ],
  entries: [
    { id: 'd-1', name: 'Isange One Stop Centre — Kacyiru', phone: '[VERIFY]', type: 'one_stop_centre', district: 'Gasabo', updatedAt: iso(-100) },
    { id: 'd-2', name: 'National Child Helpline', phone: '[VERIFY]', type: 'child_helpline', updatedAt: iso(-100) },
    { id: 'd-3', name: 'Musanze District Hospital', phone: '[VERIFY]', type: 'health_facility', district: 'Musanze', updatedAt: iso(-30) },
  ],
};
