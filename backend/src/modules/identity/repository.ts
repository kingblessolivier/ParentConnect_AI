/**
 * Repository interfaces + in-memory implementations.
 *
 * The service layer depends only on these interfaces, so the Postgres
 * implementation (next slice, ADR-0002) is a drop-in replacement and the domain
 * logic is fully testable without a database.
 */

import { randomUUID } from 'node:crypto';
import type { Consent, ParentProfile } from './types.js';

export interface ParentRepository {
  create(profile: Omit<ParentProfile, 'id' | 'createdAt'>): Promise<ParentProfile>;
  findById(id: string): Promise<ParentProfile | null>;
  findByPhoneHash(phoneHash: string): Promise<ParentProfile | null>;
  update(id: string, patch: Partial<ParentProfile>): Promise<ParentProfile>;
  /** Parents in a nudge segment: a child in `ageBand` AND `language` preferred. */
  findBySegment(ageBand: ParentProfile['childBands'][number], language: ParentProfile['preferredLanguage']): Promise<ParentProfile[]>;
  /** All parents (for aggregate M&E indicators, FR-30/31). */
  listAll(): Promise<ParentProfile[]>;
  /** Erase a parent account (right to be forgotten, NFR-17). No-op if absent. */
  delete(id: string): Promise<void>;
}

export interface ConsentRepository {
  record(consent: Omit<Consent, 'id'>): Promise<Consent>;
  withdraw(parentId: string, purpose: string, at: string): Promise<void>;
  listForParent(parentId: string): Promise<Consent[]>;
  /** Erase all of a parent's consent records (right to be forgotten, NFR-17). */
  deleteForParent(parentId: string): Promise<void>;
}

export interface OtpRecord {
  phoneHash: string;
  otpHash: string;
  expiresAtMs: number;
  attempts: number;
}

export interface OtpRepository {
  save(record: OtpRecord): Promise<void>;
  get(phoneHash: string): Promise<OtpRecord | null>;
  delete(phoneHash: string): Promise<void>;
}

export class InMemoryParentRepository implements ParentRepository {
  private readonly byId = new Map<string, ParentProfile>();

  async create(profile: Omit<ParentProfile, 'id' | 'createdAt'>): Promise<ParentProfile> {
    const created: ParentProfile = { ...profile, id: randomUUID(), createdAt: new Date().toISOString() };
    this.byId.set(created.id, created);
    return created;
  }
  async findById(id: string): Promise<ParentProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByPhoneHash(phoneHash: string): Promise<ParentProfile | null> {
    for (const p of this.byId.values()) if (p.phoneHash === phoneHash) return p;
    return null;
  }
  async update(id: string, patch: Partial<ParentProfile>): Promise<ParentProfile> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`parent ${id} not found`);
    const updated = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
    this.byId.set(id, updated);
    return updated;
  }

  async findBySegment(
    ageBand: ParentProfile['childBands'][number],
    language: ParentProfile['preferredLanguage'],
  ): Promise<ParentProfile[]> {
    return [...this.byId.values()].filter(
      (p) => p.preferredLanguage === language && p.childBands.includes(ageBand),
    );
  }

  async listAll(): Promise<ParentProfile[]> {
    return [...this.byId.values()];
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}

export class InMemoryConsentRepository implements ConsentRepository {
  private readonly items: Consent[] = [];

  async record(consent: Omit<Consent, 'id'>): Promise<Consent> {
    const created: Consent = { ...consent, id: randomUUID() };
    this.items.push(created);
    return created;
  }
  async withdraw(parentId: string, purpose: string, at: string): Promise<void> {
    for (const c of this.items) {
      if (c.parentId === parentId && c.purpose === purpose && !c.withdrawnAt) c.withdrawnAt = at;
    }
  }
  async listForParent(parentId: string): Promise<Consent[]> {
    return this.items.filter((c) => c.parentId === parentId);
  }

  async deleteForParent(parentId: string): Promise<void> {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      if (this.items[i]!.parentId === parentId) this.items.splice(i, 1);
    }
  }
}

export class InMemoryOtpRepository implements OtpRepository {
  private readonly byPhone = new Map<string, OtpRecord>();

  async save(record: OtpRecord): Promise<void> {
    this.byPhone.set(record.phoneHash, record);
  }
  async get(phoneHash: string): Promise<OtpRecord | null> {
    return this.byPhone.get(phoneHash) ?? null;
  }
  async delete(phoneHash: string): Promise<void> {
    this.byPhone.delete(phoneHash);
  }
}
