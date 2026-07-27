/**
 * Nudge repository interfaces + in-memory implementation.
 */

import { randomUUID } from 'node:crypto';
import type { AgeBand, Language } from '../identity/types.js';
import type { Campaign, Nudge, NudgeChannel } from './types.js';

export interface CreateCampaignInput {
  name: string;
  segmentAgeBand: AgeBand;
  segmentLanguage: Language;
  channel: NudgeChannel;
}

export interface NudgeRepository {
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  addNudge(campaignId: string, body: string, sendAt: string): Promise<Nudge>;
  listDue(nowIso: string): Promise<Nudge[]>;
  markDispatched(nudgeId: string, atIso: string): Promise<void>;
  optOut(parentId: string, atIso: string): Promise<void>;
  optIn(parentId: string): Promise<void>;
  isOptedOut(parentId: string): Promise<boolean>;
}

export class InMemoryNudgeRepository implements NudgeRepository {
  private readonly campaigns = new Map<string, Campaign>();
  private readonly nudges = new Map<string, Nudge>();
  private readonly optedOut = new Set<string>();

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const campaign: Campaign = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }
  async listCampaigns(): Promise<Campaign[]> {
    return [...this.campaigns.values()];
  }
  async getCampaign(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) ?? null;
  }
  async addNudge(campaignId: string, body: string, sendAt: string): Promise<Nudge> {
    const nudge: Nudge = { id: randomUUID(), campaignId, body, sendAt };
    this.nudges.set(nudge.id, nudge);
    return nudge;
  }
  async listDue(nowIso: string): Promise<Nudge[]> {
    return [...this.nudges.values()].filter((n) => !n.dispatchedAt && n.sendAt <= nowIso);
  }
  async markDispatched(nudgeId: string, atIso: string): Promise<void> {
    const nudge = this.nudges.get(nudgeId);
    if (nudge) nudge.dispatchedAt = atIso;
  }
  async optOut(parentId: string): Promise<void> {
    this.optedOut.add(parentId);
  }
  async optIn(parentId: string): Promise<void> {
    this.optedOut.delete(parentId);
  }
  async isOptedOut(parentId: string): Promise<boolean> {
    return this.optedOut.has(parentId);
  }
}
