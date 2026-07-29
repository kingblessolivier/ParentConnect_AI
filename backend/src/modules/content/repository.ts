/**
 * Content repository interfaces + in-memory implementation. The service depends
 * only on the interface; Postgres drops in behind it (pg-repository.ts).
 */

import { randomUUID } from 'node:crypto';
import type { AgeBand, Language } from '../identity/types.js';
import type {
  ContentItem,
  ContentStatus,
  ContentTopic,
  ContentVersion,
  PublishedModule,
} from './types.js';

export interface CreateItemInput {
  topic: ContentTopic;
  ageBand: AgeBand | 'all';
  language: Language;
  title: string;
  body: string;
  audioUri?: string;
  illustrationUris?: string[];
}

export interface PublishedFilter {
  topic?: ContentTopic;
  ageBand?: AgeBand | 'all';
  language?: Language;
}

/** A content version joined with its item's metadata (review queue, FR-20). */
export interface ReviewItem {
  versionId: string;
  itemId: string;
  version: number;
  status: ContentStatus;
  topic: ContentTopic;
  ageBand: AgeBand | 'all';
  language: Language;
  title: string;
  clinicalApprovedBy?: string;
  culturalApprovedBy?: string;
  createdAt: string;
}

export interface ContentRepository {
  createItemWithDraft(input: CreateItemInput): Promise<{ item: ContentItem; version: ContentVersion }>;
  getVersion(versionId: string): Promise<ContentVersion | null>;
  saveVersion(version: ContentVersion): Promise<ContentVersion>;
  listPublished(filter: PublishedFilter): Promise<PublishedModule[]>;
  getPublishedModule(itemId: string): Promise<PublishedModule | null>;
  /** Versions in the given workflow states, joined with item metadata (FR-20). */
  listByStatus(statuses: readonly ContentStatus[]): Promise<ReviewItem[]>;
}

function toModule(item: ContentItem, version: ContentVersion): PublishedModule {
  return {
    itemId: item.id,
    versionId: version.id,
    topic: item.topic,
    ageBand: item.ageBand,
    language: item.language,
    title: version.title,
    body: version.body,
    audioUri: version.audioUri ?? null,
    illustrationUris: version.illustrationUris,
  };
}

export class InMemoryContentRepository implements ContentRepository {
  private readonly items = new Map<string, ContentItem>();
  private readonly versions = new Map<string, ContentVersion>();

  async createItemWithDraft(
    input: CreateItemInput,
  ): Promise<{ item: ContentItem; version: ContentVersion }> {
    const item: ContentItem = {
      id: randomUUID(),
      topic: input.topic,
      ageBand: input.ageBand,
      language: input.language,
      createdAt: new Date().toISOString(),
    };
    const version: ContentVersion = {
      id: randomUUID(),
      itemId: item.id,
      version: 1,
      status: 'draft',
      title: input.title,
      body: input.body,
      ...(input.audioUri !== undefined ? { audioUri: input.audioUri } : {}),
      illustrationUris: input.illustrationUris ?? [],
      createdAt: new Date().toISOString(),
    };
    this.items.set(item.id, item);
    this.versions.set(version.id, version);
    return { item, version };
  }

  async getVersion(versionId: string): Promise<ContentVersion | null> {
    return this.versions.get(versionId) ?? null;
  }

  async saveVersion(version: ContentVersion): Promise<ContentVersion> {
    this.versions.set(version.id, version);
    return version;
  }

  async listPublished(filter: PublishedFilter): Promise<PublishedModule[]> {
    const modules: PublishedModule[] = [];
    for (const version of this.versions.values()) {
      if (version.status !== 'published') continue;
      const item = this.items.get(version.itemId);
      if (!item) continue;
      if (filter.topic && item.topic !== filter.topic) continue;
      if (filter.ageBand && item.ageBand !== filter.ageBand) continue;
      if (filter.language && item.language !== filter.language) continue;
      modules.push(toModule(item, version));
    }
    return modules;
  }

  async getPublishedModule(itemId: string): Promise<PublishedModule | null> {
    const item = this.items.get(itemId);
    if (!item) return null;
    for (const version of this.versions.values()) {
      if (version.itemId === itemId && version.status === 'published') return toModule(item, version);
    }
    return null;
  }

  async listByStatus(statuses: readonly ContentStatus[]): Promise<ReviewItem[]> {
    const want = new Set(statuses);
    const out: ReviewItem[] = [];
    for (const version of this.versions.values()) {
      if (!want.has(version.status)) continue;
      const item = this.items.get(version.itemId);
      if (!item) continue;
      out.push({
        versionId: version.id,
        itemId: item.id,
        version: version.version,
        status: version.status,
        topic: item.topic,
        ageBand: item.ageBand,
        language: item.language,
        title: version.title,
        ...(version.clinicalApprovedBy ? { clinicalApprovedBy: version.clinicalApprovedBy } : {}),
        ...(version.culturalApprovedBy ? { culturalApprovedBy: version.culturalApprovedBy } : {}),
        createdAt: version.createdAt,
      });
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

const STATUS_VALUES: readonly ContentStatus[] = [
  'draft',
  'clinical_review',
  'cultural_review',
  'approved',
  'published',
  'retired',
];
export function isContentStatus(value: unknown): value is ContentStatus {
  return typeof value === 'string' && (STATUS_VALUES as readonly string[]).includes(value);
}
