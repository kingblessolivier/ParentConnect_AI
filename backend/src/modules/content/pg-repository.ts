/**
 * Postgres implementation of the content repository (ADR-0002).
 * Parametrised SQL; only `published` versions are ever returned to parents.
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { AgeBand, Language } from '../identity/types.js';
import type {
  ContentRepository,
  CreateItemInput,
  PublishedFilter,
  ReviewItem,
} from './repository.js';
import type {
  ContentItem,
  ContentStatus,
  ContentTopic,
  ContentVersion,
  PublishedModule,
} from './types.js';

interface ItemRow {
  id: string;
  topic: ContentTopic;
  age_band: AgeBand | 'all';
  language: Language;
  created_at: Date | string;
}
interface VersionRow {
  id: string;
  item_id: string;
  version: number;
  status: ContentStatus;
  title: string;
  body: string;
  audio_uri: string | null;
  illustration_uris: string[] | null;
  clinical_approved_by: string | null;
  cultural_approved_by: string | null;
  published_at: Date | string | null;
  created_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

function mapVersion(r: VersionRow): ContentVersion {
  const v: ContentVersion = {
    id: r.id,
    itemId: r.item_id,
    version: r.version,
    status: r.status,
    title: r.title,
    body: r.body,
    illustrationUris: r.illustration_uris ?? [],
    createdAt: iso(r.created_at),
  };
  if (r.audio_uri != null) v.audioUri = r.audio_uri;
  if (r.clinical_approved_by != null) v.clinicalApprovedBy = r.clinical_approved_by;
  if (r.cultural_approved_by != null) v.culturalApprovedBy = r.cultural_approved_by;
  if (r.published_at != null) v.publishedAt = iso(r.published_at);
  return v;
}

function mapModule(item: ItemRow, v: VersionRow): PublishedModule {
  return {
    itemId: item.id,
    versionId: v.id,
    topic: item.topic,
    ageBand: item.age_band,
    language: item.language,
    title: v.title,
    body: v.body,
    audioUri: v.audio_uri,
    illustrationUris: v.illustration_uris ?? [],
  };
}

export class PgContentRepository implements ContentRepository {
  constructor(private readonly db: Queryable) {}

  async createItemWithDraft(
    input: CreateItemInput,
  ): Promise<{ item: ContentItem; version: ContentVersion }> {
    const itemId = randomUUID();
    const now = new Date().toISOString();
    const itemRes = await this.db.query<ItemRow>(
      `INSERT INTO content_items (id, topic, age_band, language, created_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [itemId, input.topic, input.ageBand, input.language, now],
    );
    const versionRes = await this.db.query<VersionRow>(
      `INSERT INTO content_versions
        (id, item_id, version, status, title, body, audio_uri, illustration_uris, created_at)
       VALUES ($1,$2,1,'draft',$3,$4,$5,$6,$7) RETURNING *`,
      [randomUUID(), itemId, input.title, input.body, input.audioUri ?? null, input.illustrationUris ?? [], now],
    );
    const itemRow = itemRes.rows[0]!;
    return {
      item: {
        id: itemRow.id,
        topic: itemRow.topic,
        ageBand: itemRow.age_band,
        language: itemRow.language,
        createdAt: iso(itemRow.created_at),
      },
      version: mapVersion(versionRes.rows[0]!),
    };
  }

  async getVersion(versionId: string): Promise<ContentVersion | null> {
    const r = await this.db.query<VersionRow>('SELECT * FROM content_versions WHERE id = $1', [
      versionId,
    ]);
    return r.rows[0] ? mapVersion(r.rows[0]) : null;
  }

  async saveVersion(version: ContentVersion): Promise<ContentVersion> {
    const r = await this.db.query<VersionRow>(
      `UPDATE content_versions
         SET status = $2, title = $3, body = $4, audio_uri = $5, illustration_uris = $6,
             clinical_approved_by = $7, cultural_approved_by = $8, published_at = $9
       WHERE id = $1 RETURNING *`,
      [
        version.id,
        version.status,
        version.title,
        version.body,
        version.audioUri ?? null,
        version.illustrationUris,
        version.clinicalApprovedBy ?? null,
        version.culturalApprovedBy ?? null,
        version.publishedAt ?? null,
      ],
    );
    if (!r.rows[0]) throw new Error(`content version ${version.id} not found`);
    return mapVersion(r.rows[0]);
  }

  async listPublished(filter: PublishedFilter): Promise<PublishedModule[]> {
    const clauses = ["v.status = 'published'"];
    const params: unknown[] = [];
    if (filter.topic) {
      params.push(filter.topic);
      clauses.push(`i.topic = $${params.length}`);
    }
    if (filter.ageBand) {
      params.push(filter.ageBand);
      clauses.push(`i.age_band = $${params.length}`);
    }
    if (filter.language) {
      params.push(filter.language);
      clauses.push(`i.language = $${params.length}`);
    }
    const rows = await this.db.query<ItemRow & VersionRow>(
      `SELECT i.topic, i.age_band, i.language, v.*
         FROM content_versions v JOIN content_items i ON i.id = v.item_id
        WHERE ${clauses.join(' AND ')}`,
      params,
    );
    return rows.rows.map((row) =>
      mapModule(
        { id: row.item_id, topic: row.topic, age_band: row.age_band, language: row.language, created_at: row.created_at },
        row,
      ),
    );
  }

  async getPublishedModule(itemId: string): Promise<PublishedModule | null> {
    const rows = await this.db.query<ItemRow & VersionRow>(
      `SELECT i.topic, i.age_band, i.language, v.*
         FROM content_versions v JOIN content_items i ON i.id = v.item_id
        WHERE v.item_id = $1 AND v.status = 'published' LIMIT 1`,
      [itemId],
    );
    const row = rows.rows[0];
    if (!row) return null;
    return mapModule(
      { id: itemId, topic: row.topic, age_band: row.age_band, language: row.language, created_at: row.created_at },
      row,
    );
  }

  async listByStatus(statuses: readonly ContentStatus[]): Promise<ReviewItem[]> {
    if (statuses.length === 0) return [];
    const where = statuses.map((_, i) => `v.status = $${i + 1}`).join(' OR ');
    const rows = await this.db.query<ItemRow & VersionRow>(
      `SELECT i.topic, i.age_band, i.language, v.*
         FROM content_versions v JOIN content_items i ON i.id = v.item_id
        WHERE ${where}
        ORDER BY v.created_at ASC`,
      [...statuses],
    );
    return rows.rows.map((row) => ({
      versionId: row.id,
      itemId: row.item_id,
      version: row.version,
      status: row.status,
      topic: row.topic,
      ageBand: row.age_band,
      language: row.language,
      title: row.title,
      ...(row.clinical_approved_by != null ? { clinicalApprovedBy: row.clinical_approved_by } : {}),
      ...(row.cultural_approved_by != null ? { culturalApprovedBy: row.cultural_approved_by } : {}),
      createdAt: iso(row.created_at),
    }));
  }
}
