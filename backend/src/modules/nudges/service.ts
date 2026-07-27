/**
 * Nudge service (FR-17): create campaigns, schedule nudges, dispatch due nudges
 * to the right segment over the channel gateway, and honour opt-out (NFR-17).
 *
 * Dispatch is normally driven by a scheduled worker calling `dispatchDue()`;
 * an admin endpoint can also trigger it. Recipients are resolved by segment
 * (child age band + preferred language), opted-out parents are skipped, and the
 * encrypted phone is decrypted only at the moment of sending.
 */

import { decryptSecret } from '../../lib/crypto.js';
import { AppError } from '../../lib/problem.js';
import type { ParentRepository } from '../identity/repository.js';
import type { MessageGateway } from '../messaging/gateway.js';
import type { CreateCampaignInput, NudgeRepository } from './repository.js';
import type { Campaign, Nudge } from './types.js';

export interface DispatchResult {
  nudges: number;
  deliveries: number;
}

export class NudgeService {
  constructor(
    private readonly nudgeRepo: NudgeRepository,
    private readonly parentRepo: ParentRepository,
    private readonly gateway: MessageGateway,
    private readonly phoneEncKey: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    if (!input.name?.trim()) throw new AppError(400, 'Invalid input', 'name is required');
    return this.nudgeRepo.createCampaign(input);
  }

  listCampaigns(): Promise<Campaign[]> {
    return this.nudgeRepo.listCampaigns();
  }

  async addNudge(campaignId: string, body: string, sendAtIso: string): Promise<Nudge> {
    if (!(await this.nudgeRepo.getCampaign(campaignId))) {
      throw new AppError(404, 'Not Found', 'campaign not found');
    }
    if (!body?.trim()) throw new AppError(400, 'Invalid input', 'body is required');
    return this.nudgeRepo.addNudge(campaignId, body, sendAtIso);
  }

  optOut(parentId: string): Promise<void> {
    return this.nudgeRepo.optOut(parentId, this.now());
  }
  optIn(parentId: string): Promise<void> {
    return this.nudgeRepo.optIn(parentId);
  }

  /** Send every nudge whose send time has passed, to its segment. */
  async dispatchDue(): Promise<DispatchResult> {
    const nowIso = this.now();
    const due = await this.nudgeRepo.listDue(nowIso);
    let deliveries = 0;

    for (const nudge of due) {
      const campaign = await this.nudgeRepo.getCampaign(nudge.campaignId);
      if (campaign) {
        const recipients = await this.parentRepo.findBySegment(
          campaign.segmentAgeBand,
          campaign.segmentLanguage,
        );
        for (const parent of recipients) {
          if (await this.nudgeRepo.isOptedOut(parent.id)) continue;
          if (!parent.phoneEnc) continue; // no reachable number stored
          if (campaign.channel === 'sms') {
            const to = decryptSecret(parent.phoneEnc, this.phoneEncKey);
            await this.gateway.sendSms({ to, body: nudge.body });
            deliveries += 1;
          }
          // 'push' requires a push provider (FCM) — a later slice.
        }
      }
      await this.nudgeRepo.markDispatched(nudge.id, nowIso);
    }
    return { nudges: due.length, deliveries };
  }
}
