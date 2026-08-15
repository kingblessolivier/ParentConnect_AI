/**
 * Referral-directory service (FR-21/33).
 *
 * Resolves the **effective** directory and guards edits so the safety
 * invariant can't be edited away:
 *
 *  - overrides present  → serve the overrides;
 *  - overrides empty    → serve the file baseline (ADR-0010);
 *  - storage unreachable→ serve the file baseline, and let the caller log it.
 *
 * Removing the last override is therefore safe (it falls back to the file),
 * but the file baseline itself is never editable at runtime — that's a
 * deployment artefact, and it's what makes "there is always a referral
 * pathway" true even with an empty or broken database (NFR-06).
 */

import { AppError } from '../../lib/problem.js';
import type { DirectoryRepository, DirectoryEntry } from './directory-repository.js';
import { validateReferralDirectory, type ReferralContact } from './referral-directory.js';

/** Validate a single contact by reusing the directory validator (one rule set). */
export function validateContact(raw: unknown): ReferralContact {
  try {
    const [contact] = validateReferralDirectory([raw]);
    return contact!;
  } catch (err) {
    throw new AppError(400, 'Invalid input', (err as Error).message.replace('referral[0].', ''));
  }
}

export class DirectoryService {
  constructor(
    private readonly repo: DirectoryRepository,
    /** The file bundle loaded at boot — the guaranteed-present fallback. */
    private readonly baseline: readonly ReferralContact[],
    private readonly onStorageError?: (err: unknown) => void,
  ) {}

  /** What callers (and a parent in crisis) actually get. */
  async effective(): Promise<ReferralContact[]> {
    try {
      const overrides = await this.repo.list();
      if (overrides.length > 0) return overrides.map(stripStorageFields);
    } catch (err) {
      // Never let a storage problem remove the referral pathway (NFR-06).
      this.onStorageError?.(err);
    }
    return [...this.baseline];
  }

  /** Admin view: the editable overrides, plus whether the baseline is in use. */
  async listForAdmin(): Promise<{ entries: DirectoryEntry[]; usingBaseline: boolean; baseline: ReferralContact[] }> {
    const entries = await this.repo.list();
    return { entries, usingBaseline: entries.length === 0, baseline: [...this.baseline] };
  }

  async create(raw: unknown, at: string): Promise<DirectoryEntry> {
    return this.repo.create(validateContact(raw), at);
  }

  async update(id: string, raw: unknown, at: string): Promise<DirectoryEntry> {
    const updated = await this.repo.update(id, validateContact(raw), at);
    if (!updated) throw new AppError(404, 'Not Found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new AppError(404, 'Not Found');
  }
}

function stripStorageFields(entry: DirectoryEntry): ReferralContact {
  const contact: ReferralContact = { name: entry.name, phone: entry.phone, type: entry.type };
  if (entry.district) contact.district = entry.district;
  return contact;
}
