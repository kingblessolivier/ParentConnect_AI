/**
 * OTP request/verify with rate limiting (FR-01).
 *
 * OTPs are stored **hashed** (never in clear). Verification is limited to
 * `otpMaxAttempts`; exceeding it locks the current OTP. The OTP generator and
 * clock are injectable so behaviour is deterministic in tests. The raw OTP is
 * returned from `request()` ONLY so the caller (the SMS gateway) can deliver it;
 * it is never persisted or logged in clear.
 */

import { AppError } from '../../lib/problem.js';
import { constantTimeEqual, generateOtp, hashPhone, hmacHex } from '../../lib/crypto.js';
import type { AppConfig } from '../../config.js';
import type { OtpRepository } from './repository.js';

export interface OtpDeps {
  otpRepo: OtpRepository;
  config: Pick<AppConfig, 'phonePepper' | 'otpTtlSeconds' | 'otpMaxAttempts'>;
  now?: () => number;
  otpGenerator?: () => string;
}

export class OtpService {
  private readonly otpRepo: OtpRepository;
  private readonly config: OtpDeps['config'];
  private readonly now: () => number;
  private readonly generate: () => string;

  constructor(deps: OtpDeps) {
    this.otpRepo = deps.otpRepo;
    this.config = deps.config;
    this.now = deps.now ?? (() => Date.now());
    this.generate = deps.otpGenerator ?? generateOtp;
  }

  private hashOtp(phoneHash: string, code: string): string {
    return hmacHex(`${phoneHash}:${code}`, this.config.phonePepper);
  }

  /** Create and store an OTP for a phone. Returns the raw code for delivery. */
  async request(phone: string): Promise<{ code: string; expiresInSeconds: number }> {
    const phoneHash = hashPhone(phone, this.config.phonePepper);
    const code = this.generate();
    await this.otpRepo.save({
      phoneHash,
      otpHash: this.hashOtp(phoneHash, code),
      expiresAtMs: this.now() + this.config.otpTtlSeconds * 1000,
      attempts: 0,
    });
    return { code, expiresInSeconds: this.config.otpTtlSeconds };
  }

  /** Verify an OTP. Returns the phoneHash on success; throws AppError otherwise. */
  async verify(phone: string, code: string): Promise<{ phoneHash: string }> {
    const phoneHash = hashPhone(phone, this.config.phonePepper);
    const record = await this.otpRepo.get(phoneHash);
    if (!record) throw new AppError(401, 'Invalid or expired code');

    if (record.expiresAtMs < this.now()) {
      await this.otpRepo.delete(phoneHash);
      throw new AppError(401, 'Invalid or expired code');
    }
    if (record.attempts >= this.config.otpMaxAttempts) {
      throw new AppError(429, 'Too many attempts', 'This code is locked; request a new one.');
    }

    const matches = constantTimeEqual(record.otpHash, this.hashOtp(phoneHash, code));
    if (!matches) {
      await this.otpRepo.save({ ...record, attempts: record.attempts + 1 });
      throw new AppError(401, 'Invalid or expired code');
    }

    await this.otpRepo.delete(phoneHash);
    return { phoneHash };
  }
}
