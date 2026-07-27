/**
 * Consent service (NFR-16): record informed consent in the user's language
 * before processing, and support withdrawal (NFR-17).
 */

import type { ConsentRepository } from './repository.js';
import type { Consent, ConsentInput } from './types.js';

export class ConsentService {
  constructor(
    private readonly consentRepo: ConsentRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async record(parentId: string, input: ConsentInput): Promise<Consent> {
    return this.consentRepo.record({
      parentId,
      purpose: input.purpose,
      language: input.language,
      method: input.method,
      givenAt: this.now(),
    });
  }

  async withdraw(parentId: string, purpose: string): Promise<void> {
    await this.consentRepo.withdraw(parentId, purpose, this.now());
  }

  async list(parentId: string): Promise<Consent[]> {
    return this.consentRepo.listForParent(parentId);
  }
}
