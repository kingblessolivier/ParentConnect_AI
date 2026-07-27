/**
 * Identity service: registration (self + assisted), profile, tokens.
 *
 * - Self-registration (FR-01): after OTP verification, get-or-create the parent.
 * - Assisted onboarding (FR-03): a CHW/champion/admin creates a parent + records
 *   consent on their behalf.
 * - Profile (FR-06): update the age-band-only profile.
 * - Anonymity (FR-04): no real name is ever required.
 */

import { AppError } from '../../lib/problem.js';
import { encryptSecret, hashPhone, signToken } from '../../lib/crypto.js';
import type { AppConfig } from '../../config.js';
import type { ParentRepository } from './repository.js';
import type { ParentProfile, ProfileInput, Role } from './types.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type IdentityConfig = Pick<
  AppConfig,
  'phonePepper' | 'phoneEncKey' | 'jwtSecret' | 'accessTtlSeconds' | 'refreshTtlSeconds'
>;

export class IdentityService {
  constructor(
    private readonly parentRepo: ParentRepository,
    private readonly config: IdentityConfig,
  ) {}

  private applyProfile(base: ProfileInput, defaults: Partial<ParentProfile> = {}) {
    return {
      ...(base.displayAlias !== undefined ? { displayAlias: base.displayAlias } : {}),
      ...(base.district !== undefined ? { district: base.district } : {}),
      ...(base.sector !== undefined ? { sector: base.sector } : {}),
      ...(base.urbanRural !== undefined ? { urbanRural: base.urbanRural } : {}),
      ...(base.caregiverGender !== undefined ? { caregiverGender: base.caregiverGender } : {}),
      preferredLanguage: base.preferredLanguage ?? defaults.preferredLanguage ?? 'rw',
      preferredChannel: base.preferredChannel ?? defaults.preferredChannel ?? 'app',
      childBands: base.childBands ?? defaults.childBands ?? [],
    };
  }

  /** Get-or-create a parent for a verified phone number (self-registration). */
  async registerVerified(phone: string, profile: ProfileInput): Promise<ParentProfile> {
    const phoneHash = hashPhone(phone, this.config.phonePepper);
    const existing = await this.parentRepo.findByPhoneHash(phoneHash);
    if (existing) return existing;
    const phoneEnc = encryptSecret(phone, this.config.phoneEncKey);
    return this.parentRepo.create({
      phoneHash,
      phoneEnc,
      role: 'parent',
      ...this.applyProfile(profile),
    });
  }

  /** Assisted onboarding by a CHW/champion/admin (FR-03). */
  async assistedOnboard(phone: string, profile: ProfileInput): Promise<ParentProfile> {
    const phoneHash = hashPhone(phone, this.config.phonePepper);
    const existing = await this.parentRepo.findByPhoneHash(phoneHash);
    if (existing) throw new AppError(409, 'Parent already registered');
    const phoneEnc = encryptSecret(phone, this.config.phoneEncKey);
    return this.parentRepo.create({
      phoneHash,
      phoneEnc,
      role: 'parent',
      ...this.applyProfile(profile),
    });
  }

  async getProfile(id: string): Promise<ParentProfile> {
    const parent = await this.parentRepo.findById(id);
    if (!parent) throw new AppError(404, 'Not Found');
    return parent;
  }

  async updateProfile(id: string, profile: ProfileInput): Promise<ParentProfile> {
    const parent = await this.getProfile(id);
    return this.parentRepo.update(id, this.applyProfile(profile, parent));
  }

  issueTokens(parent: Pick<ParentProfile, 'id' | 'role'>): TokenPair {
    const claims = { sub: parent.id, role: parent.role };
    return {
      accessToken: signToken({ ...claims, type: 'access' }, this.config.jwtSecret, this.config.accessTtlSeconds),
      refreshToken: signToken({ ...claims, type: 'refresh' }, this.config.jwtSecret, this.config.refreshTtlSeconds),
      expiresIn: this.config.accessTtlSeconds,
    };
  }
}

/** Roles permitted to perform assisted onboarding (FR-03, RBAC FR-05). */
export const ASSISTED_ONBOARDING_ROLES: readonly Role[] = ['chw', 'champion', 'admin'];
