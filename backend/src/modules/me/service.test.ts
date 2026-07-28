import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryParentRepository } from '../identity/repository.js';
import { MeService, parseDimension } from './service.js';
import { InMemoryAssessmentRepository } from './repository.js';

async function seedParent(
  parents: InMemoryParentRepository,
  over: Partial<Parameters<InMemoryParentRepository['create']>[0]> = {},
): Promise<string> {
  const p = await parents.create({
    phoneHash: `h-${Math.random()}`,
    role: 'parent',
    preferredLanguage: 'rw',
    preferredChannel: 'sms',
    childBands: ['13_15'],
    ...over,
  });
  return p.id;
}

describe('MeService.submit', () => {
  let parents: InMemoryParentRepository;
  let assessments: InMemoryAssessmentRepository;
  let service: MeService;

  beforeEach(() => {
    parents = new InMemoryParentRepository();
    assessments = new InMemoryAssessmentRepository();
    service = new MeService(assessments, parents);
  });

  it('stores a valid baseline and returns it', async () => {
    const r = await service.submit('p1', 'baseline', {
      knowledge: 40,
      confidence: 30,
      communication: 20,
    });
    expect(r.type).toBe('baseline');
    expect(r.scores).toEqual({ knowledge: 40, confidence: 30, communication: 20 });
  });

  it('resubmitting the same type replaces (upsert)', async () => {
    await service.submit('p1', 'baseline', { knowledge: 10, confidence: 10, communication: 10 });
    await service.submit('p1', 'baseline', { knowledge: 90, confidence: 90, communication: 90 });
    const report = await service.parentReport('p1');
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.scores.knowledge).toBe(90);
  });

  it('rejects an unknown assessment type (400)', async () => {
    await expect(
      service.submit('p1', 'midline' as 'baseline', { knowledge: 1, confidence: 1, communication: 1 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects missing or out-of-range scores (400)', async () => {
    await expect(service.submit('p1', 'baseline', null)).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.submit('p1', 'baseline', { knowledge: 120, confidence: 0, communication: 0 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.submit('p1', 'baseline', { knowledge: 0, confidence: 0 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('MeService.parentReport', () => {
  it('reports the parent’s own baseline→follow-up delta', async () => {
    const parents = new InMemoryParentRepository();
    const service = new MeService(new InMemoryAssessmentRepository(), parents);
    await service.submit('p1', 'baseline', { knowledge: 20, confidence: 30, communication: 10 });
    await service.submit('p1', 'followup', { knowledge: 60, confidence: 50, communication: 40 });
    const report = await service.parentReport('p1');
    expect(report.delta).toEqual({ knowledge: 40, confidence: 20, communication: 30 });
  });

  it('delta is null when the pair is incomplete', async () => {
    const service = new MeService(new InMemoryAssessmentRepository(), new InMemoryParentRepository());
    await service.submit('p1', 'baseline', { knowledge: 20, confidence: 30, communication: 10 });
    const report = await service.parentReport('p1');
    expect(report.delta.knowledge).toBeNull();
  });
});

describe('MeService.indicators', () => {
  it('disaggregates by a real parent dimension', async () => {
    const parents = new InMemoryParentRepository();
    const assessments = new InMemoryAssessmentRepository();
    const service = new MeService(assessments, parents);
    const p1 = await seedParent(parents, { district: 'Gasabo' });
    const p2 = await seedParent(parents, { district: 'Gasabo' });
    await seedParent(parents, { district: 'Nyarugenge' });
    await service.submit(p1, 'baseline', { knowledge: 20, confidence: 20, communication: 20 });
    await service.submit(p1, 'followup', { knowledge: 60, confidence: 40, communication: 30 });
    await service.submit(p2, 'baseline', { knowledge: 50, confidence: 50, communication: 50 });
    await service.submit(p2, 'followup', { knowledge: 60, confidence: 70, communication: 50 });

    const rows = await service.indicators('district');
    const gasabo = rows.find((r) => r.group === 'Gasabo');
    expect(gasabo?.reach).toBe(2);
    expect(gasabo?.knowledgeChange).toBe(25);
    expect(rows.find((r) => r.group === 'Nyarugenge')?.knowledgeChange).toBeNull();
  });

  it('serialises indicators as CSV', async () => {
    const parents = new InMemoryParentRepository();
    const service = new MeService(new InMemoryAssessmentRepository(), parents);
    await seedParent(parents, { district: 'Gasabo' });
    const csv = await service.indicatorsCsv('district');
    expect(csv.split('\n')[0]).toBe(
      'district,reach,knowledge_change,confidence_change,communication_change',
    );
  });
});

describe('parseDimension', () => {
  it('accepts the known dimensions', () => {
    expect(parseDimension('district')).toBe('district');
    expect(parseDimension('urbanRural')).toBe('urbanRural');
  });
  it('rejects anything else (400)', () => {
    expect(() => parseDimension('age')).toThrow();
    expect(() => parseDimension(undefined)).toThrow();
  });
});
