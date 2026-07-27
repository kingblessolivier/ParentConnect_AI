/**
 * Nudge domain types (FR-17). Scheduled parenting tips, segmented by child age
 * band + language, delivered over SMS/push.
 */

import type { AgeBand, Language } from '../identity/types.js';

export type NudgeChannel = 'sms' | 'push';

export interface Campaign {
  id: string;
  name: string;
  segmentAgeBand: AgeBand;
  segmentLanguage: Language;
  channel: NudgeChannel;
  createdAt: string;
}

export interface Nudge {
  id: string;
  campaignId: string;
  body: string;
  sendAt: string;
  dispatchedAt?: string;
}
