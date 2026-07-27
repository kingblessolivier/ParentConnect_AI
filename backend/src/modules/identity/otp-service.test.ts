import { describe, it, expect } from 'vitest';
import { OtpService } from './otp-service.js';
import { InMemoryOtpRepository } from './repository.js';

const config = { phonePepper: 'pepper', otpTtlSeconds: 600, otpMaxAttempts: 3 };
const PHONE = '+250788123456';

function makeService(overrides: Partial<{ now: () => number; otpGenerator: () => string }> = {}) {
  return new OtpService({ otpRepo: new InMemoryOtpRepository(), config, ...overrides });
}

describe('OtpService', () => {
  it('requests and verifies a correct code', async () => {
    const svc = makeService({ otpGenerator: () => '123456' });
    const { code, expiresInSeconds } = await svc.request(PHONE);
    expect(code).toBe('123456');
    expect(expiresInSeconds).toBe(600);
    const { phoneHash } = await svc.verify(PHONE, '123456');
    expect(phoneHash).toBeTruthy();
  });

  it('is single-use (a verified code cannot be reused)', async () => {
    const svc = makeService({ otpGenerator: () => '123456' });
    await svc.request(PHONE);
    await svc.verify(PHONE, '123456');
    await expect(svc.verify(PHONE, '123456')).rejects.toThrow(/Invalid or expired/);
  });

  it('rejects a wrong code and locks after max attempts (FR-01)', async () => {
    const svc = makeService({ otpGenerator: () => '123456' });
    await svc.request(PHONE);
    await expect(svc.verify(PHONE, '000000')).rejects.toThrow(/Invalid/);
    await expect(svc.verify(PHONE, '000000')).rejects.toThrow(/Invalid/);
    await expect(svc.verify(PHONE, '000000')).rejects.toThrow(/Invalid/);
    // 4th attempt (attempts now == max) -> locked
    await expect(svc.verify(PHONE, '123456')).rejects.toThrow(/locked/);
  });

  it('rejects an expired code', async () => {
    let t = 1_000_000;
    const svc = makeService({ otpGenerator: () => '123456', now: () => t });
    await svc.request(PHONE);
    t += 601 * 1000; // past TTL
    await expect(svc.verify(PHONE, '123456')).rejects.toThrow(/Invalid or expired/);
  });

  it('rejects verify with no outstanding request', async () => {
    const svc = makeService();
    await expect(svc.verify(PHONE, '123456')).rejects.toThrow(/Invalid or expired/);
  });
});
