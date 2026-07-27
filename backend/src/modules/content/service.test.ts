import { describe, it, expect } from 'vitest';
import { ContentService } from './service.js';
import { InMemoryContentRepository } from './repository.js';
import type { CreateItemInput } from './repository.js';

const DRAFT: CreateItemInput = {
  topic: 'puberty_development',
  ageBand: '13_15',
  language: 'rw',
  title: 'Talking about periods',
  body: 'Approved body...',
  audioUri: 's3://audio/1.mp3',
};

function service() {
  return new ContentService(new InMemoryContentRepository(), () => '2026-07-27T00:00:00.000Z');
}

async function publish(svc: ContentService, versionId: string) {
  await svc.transition(versionId, 'clinical_review', { parentId: 'r1', role: 'reviewer' });
  await svc.transition(versionId, 'cultural_review', { parentId: 'r1', role: 'reviewer' });
  await svc.transition(versionId, 'approved', { parentId: 'r2', role: 'reviewer' });
  return svc.transition(versionId, 'published', { parentId: 'a1', role: 'admin' });
}

describe('ContentService', () => {
  it('createDraft requires title and body', async () => {
    await expect(service().createDraft({ ...DRAFT, title: '' })).rejects.toThrow(/title/);
    await expect(service().createDraft({ ...DRAFT, body: ' ' })).rejects.toThrow(/body/);
  });

  it('unapproved content is never served (FR-20)', async () => {
    const svc = service();
    const draft = await svc.createDraft(DRAFT);
    // still a draft -> not listed, not fetchable
    expect(await svc.listPublished({})).toHaveLength(0);
    await svc.transition(draft.id, 'clinical_review', { parentId: 'r1', role: 'reviewer' });
    expect(await svc.listPublished({})).toHaveLength(0); // in review, still not served
  });

  it('serves content once published, stamping approvers + publishedAt', async () => {
    const svc = service();
    const draft = await svc.createDraft(DRAFT);
    const published = await publish(svc, draft.id);
    expect(published.status).toBe('published');
    expect(published.clinicalApprovedBy).toBe('r1');
    expect(published.culturalApprovedBy).toBe('r2');
    expect(published.publishedAt).toBe('2026-07-27T00:00:00.000Z');

    const modules = await svc.listPublished({});
    expect(modules).toHaveLength(1);
    expect(modules[0]?.audioUri).toBe('s3://audio/1.mp3'); // audio present (FR-19)
    const one = await svc.getPublishedModule(modules[0]!.itemId);
    expect(one.title).toBe('Talking about periods');
  });

  it('filters published content by topic/ageBand/language', async () => {
    const svc = service();
    const a = await svc.createDraft(DRAFT);
    const b = await svc.createDraft({ ...DRAFT, topic: 'consent', ageBand: '16_19', language: 'en' });
    await publish(svc, a.id);
    await publish(svc, b.id);
    expect(await svc.listPublished({ topic: 'consent' })).toHaveLength(1);
    expect(await svc.listPublished({ language: 'rw' })).toHaveLength(1);
    expect(await svc.listPublished({ ageBand: '16_19' })).toHaveLength(1);
  });

  it('transition on an unknown version → 404', async () => {
    await expect(
      service().transition('nope', 'clinical_review', { parentId: 'r1', role: 'reviewer' }),
    ).rejects.toThrow(/not found/);
  });

  it('getPublishedModule on an unknown/unpublished item → 404', async () => {
    const svc = service();
    const draft = await svc.createDraft(DRAFT);
    await expect(svc.getPublishedModule(draft.itemId)).rejects.toThrow(/no published/);
  });
});
