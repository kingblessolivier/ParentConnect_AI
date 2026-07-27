/**
 * Postgres implementation of the nudge repository (ADR-0002).
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { CreateCampaignInput, NudgeRepository } from './repository.js';
import type { Campaign, Nudge, NudgeChannel } from './types.js';

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

interface CampaignRow {
  id: string;
  name: string;
  segment_age_band: Campaign['segmentAgeBand'];
  segment_language: Campaign['segmentLanguage'];
  channel: NudgeChannel;
  created_at: Date | string;
}
interface NudgeRow {
  id: string;
  campaign_id: string;
  body: string;
  send_at: Date | string;
  dispatched_at: Date | string | null;
}

function mapCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    name: r.name,
    segmentAgeBand: r.segment_age_band,
    segmentLanguage: r.segment_language,
    channel: r.channel,
    createdAt: iso(r.created_at),
  };
}
function mapNudge(r: NudgeRow): Nudge {
  const n: Nudge = { id: r.id, campaignId: r.campaign_id, body: r.body, sendAt: iso(r.send_at) };
  if (r.dispatched_at != null) n.dispatchedAt = iso(r.dispatched_at);
  return n;
}

export class PgNudgeRepository implements NudgeRepository {
  constructor(private readonly db: Queryable) {}

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const r = await this.db.query<CampaignRow>(
      `INSERT INTO nudge_campaigns (id, name, segment_age_band, segment_language, channel, created_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), input.name, input.segmentAgeBand, input.segmentLanguage, input.channel, new Date().toISOString()],
    );
    return mapCampaign(r.rows[0]!);
  }
  async listCampaigns(): Promise<Campaign[]> {
    const r = await this.db.query<CampaignRow>('SELECT * FROM nudge_campaigns ORDER BY created_at');
    return r.rows.map(mapCampaign);
  }
  async getCampaign(id: string): Promise<Campaign | null> {
    const r = await this.db.query<CampaignRow>('SELECT * FROM nudge_campaigns WHERE id = $1', [id]);
    return r.rows[0] ? mapCampaign(r.rows[0]) : null;
  }
  async addNudge(campaignId: string, body: string, sendAt: string): Promise<Nudge> {
    const r = await this.db.query<NudgeRow>(
      `INSERT INTO nudges (id, campaign_id, body, send_at) VALUES ($1,$2,$3,$4) RETURNING *`,
      [randomUUID(), campaignId, body, sendAt],
    );
    return mapNudge(r.rows[0]!);
  }
  async listDue(nowIso: string): Promise<Nudge[]> {
    const r = await this.db.query<NudgeRow>(
      'SELECT * FROM nudges WHERE dispatched_at IS NULL AND send_at <= $1',
      [nowIso],
    );
    return r.rows.map(mapNudge);
  }
  async markDispatched(nudgeId: string, atIso: string): Promise<void> {
    await this.db.query('UPDATE nudges SET dispatched_at = $2 WHERE id = $1', [nudgeId, atIso]);
  }
  async optOut(parentId: string, atIso: string): Promise<void> {
    await this.db.query(
      `INSERT INTO nudge_opt_outs (parent_id, opted_out_at) VALUES ($1,$2)
       ON CONFLICT (parent_id) DO NOTHING`,
      [parentId, atIso],
    );
  }
  async optIn(parentId: string): Promise<void> {
    await this.db.query('DELETE FROM nudge_opt_outs WHERE parent_id = $1', [parentId]);
  }
  async isOptedOut(parentId: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM nudge_opt_outs WHERE parent_id = $1', [parentId]);
    return r.rows.length > 0;
  }
}
