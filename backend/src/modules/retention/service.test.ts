import { describe, it, expect } from 'vitest';
import { InMemoryOtpRepository } from '../identity/repository.js';
import { InMemoryAuditRepository } from '../audit/repository.js';
import { AuditService } from '../audit/service.js';
import { RETENTION_RULES, cutoffFor, enforceableRules } from './policy.js';
import { RetentionService } from './service.js';

const NOW = new Date('2026-08-01T12:00:00.000Z');

function makeOtpRepo(): InMemoryOtpRepository {
  return new InMemoryOtpRepository();
}

describe('retention policy', () => {
  it('never schedules deletion for records held under a legal duty or immutability', () => {
    for (const data of ['referral', 'audit_event']) {
      const rule = RETENTION_RULES.find((r) => r.data === data);
      expect(rule?.onExpiry).toBe('retain');
      expect(rule?.days).toBeNull();
      expect(rule?.appliesToday).toBe(false);
    }
  });

  it('computes a cutoff for windowed rules and none for retained ones', () => {
    const messages = RETENTION_RULES.find((r) => r.data === 'coach_message_body')!;
    expect(cutoffFor(messages, NOW)?.toISOString()).toBe('2026-05-03T12:00:00.000Z');
    expect(cutoffFor(RETENTION_RULES.find((r) => r.data === 'referral')!, NOW)).toBeNull();
  });

  it('only marks rules enforceable when the data they govern actually exists', () => {
    expect(enforceableRules().map((r) => r.data)).toEqual(['otp']);
  });
});

describe('RetentionService', () => {
  it('purges expired OTPs and leaves live ones alone', async () => {
    const otpRepo = makeOtpRepo();
    await otpRepo.save({ phoneHash: 'expired', otpHash: 'x', expiresAtMs: NOW.getTime() - 1_000, attempts: 0 });
    await otpRepo.save({ phoneHash: 'live', otpHash: 'y', expiresAtMs: NOW.getTime() + 60_000, attempts: 0 });

    const report = await new RetentionService({ otpRepo }).run(NOW);

    expect(report.applied).toEqual([{ data: 'otp', removed: 1 }]);
    expect(await otpRepo.get('expired')).toBeNull();
    expect(await otpRepo.get('live')).not.toBeNull();
  });

  it('reports rules it could not enforce, so coverage is visible not implied', async () => {
    const report = await new RetentionService({ otpRepo: makeOtpRepo() }).run(NOW);
    const names = report.notEnforced.map((r) => r.data);
    expect(names).toContain('coach_message_body');
    expect(names).toContain('referral');
    expect(names).toContain('audit_event');
  });

  it('audits the run as counts only — never content (NFR-11/15)', async () => {
    const otpRepo = makeOtpRepo();
    await otpRepo.save({ phoneHash: 'expired', otpHash: 'secret-hash', expiresAtMs: NOW.getTime() - 1, attempts: 0 });
    const auditRepo = new InMemoryAuditRepository();

    await new RetentionService({ otpRepo, audit: new AuditService(auditRepo) }).run(NOW);
    await new Promise((r) => setTimeout(r, 0));

    const [event] = await auditRepo.list({ action: 'retention.applied' });
    expect(event?.metadata).toEqual({ otp: '1' });
    expect(JSON.stringify(event)).not.toContain('secret-hash');
  });

  it('does not write an audit event when nothing expired (no noise)', async () => {
    const auditRepo = new InMemoryAuditRepository();
    await new RetentionService({ otpRepo: makeOtpRepo(), audit: new AuditService(auditRepo) }).run(NOW);
    await new Promise((r) => setTimeout(r, 0));
    expect(await auditRepo.list()).toHaveLength(0);
  });

  it('is idempotent — a second run removes nothing further', async () => {
    const otpRepo = makeOtpRepo();
    await otpRepo.save({ phoneHash: 'expired', otpHash: 'x', expiresAtMs: NOW.getTime() - 1, attempts: 0 });
    const service = new RetentionService({ otpRepo });

    expect((await service.run(NOW)).totalRemoved).toBe(1);
    expect((await service.run(NOW)).totalRemoved).toBe(0);
  });
});
