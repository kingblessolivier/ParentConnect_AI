/**
 * Editable referral-directory storage (FR-33).
 *
 * The file bundle (`referral-directory.json`, ADR-0010) stays the **baseline**
 * that guarantees a referral pathway exists at boot. This repository is an
 * *override* layer an admin can edit without a redeploy: when it holds entries
 * they are served instead of the file; when it is empty — or unreachable — the
 * file baseline is served.
 *
 * That ordering is deliberate. A disclosure must always surface a referral
 * (NFR-06), so runtime editing may never be able to leave the system with no
 * directory at all, and the pathway must not acquire a hard database
 * dependency it didn't previously have.
 */

import { randomUUID } from 'node:crypto';
import type { ReferralContact } from './referral-directory.js';

/** A stored contact carries an id so it can be edited/removed individually. */
export interface DirectoryEntry extends ReferralContact {
  id: string;
  updatedAt: string;
}

export interface DirectoryRepository {
  list(): Promise<DirectoryEntry[]>;
  create(contact: ReferralContact, at: string): Promise<DirectoryEntry>;
  update(id: string, contact: ReferralContact, at: string): Promise<DirectoryEntry | null>;
  remove(id: string): Promise<boolean>;
}

export class InMemoryDirectoryRepository implements DirectoryRepository {
  private readonly entries = new Map<string, DirectoryEntry>();

  async list(): Promise<DirectoryEntry[]> {
    return [...this.entries.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(contact: ReferralContact, at: string): Promise<DirectoryEntry> {
    const entry: DirectoryEntry = { ...contact, id: randomUUID(), updatedAt: at };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async update(id: string, contact: ReferralContact, at: string): Promise<DirectoryEntry | null> {
    if (!this.entries.has(id)) return null;
    const entry: DirectoryEntry = { ...contact, id, updatedAt: at };
    this.entries.set(id, entry);
    return entry;
  }

  async remove(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }
}
