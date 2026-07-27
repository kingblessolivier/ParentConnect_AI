/**
 * Postgres implementations of the identity repositories (ADR-0002).
 *
 * Same interfaces as the in-memory versions, so the service layer and its tests
 * are unchanged. All queries are parametrised; dynamic column names come only
 * from a fixed whitelist (never from user input).
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type {
  ConsentRepository,
  OtpRecord,
  OtpRepository,
  ParentRepository,
} from './repository.js';
import type { Consent, ParentProfile } from './types.js';

interface ParentRow {
  id: string;
  phone_hash: string;
  display_alias: string | null;
  district: string | null;
  sector: string | null;
  urban_rural: ParentProfile['urbanRural'] | null;
  caregiver_gender: ParentProfile['caregiverGender'] | null;
  preferred_language: ParentProfile['preferredLanguage'];
  preferred_channel: ParentProfile['preferredChannel'];
  child_bands: ParentProfile['childBands'] | null;
  role: ParentProfile['role'];
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapParent(row: ParentRow): ParentProfile {
  const p: ParentProfile = {
    id: row.id,
    phoneHash: row.phone_hash,
    preferredLanguage: row.preferred_language,
    preferredChannel: row.preferred_channel,
    childBands: row.child_bands ?? [],
    role: row.role,
    createdAt: toIso(row.created_at),
  };
  if (row.display_alias != null) p.displayAlias = row.display_alias;
  if (row.district != null) p.district = row.district;
  if (row.sector != null) p.sector = row.sector;
  if (row.urban_rural != null) p.urbanRural = row.urban_rural;
  if (row.caregiver_gender != null) p.caregiverGender = row.caregiver_gender;
  return p;
}

const UPDATABLE_COLUMNS: Record<string, string> = {
  displayAlias: 'display_alias',
  district: 'district',
  sector: 'sector',
  urbanRural: 'urban_rural',
  caregiverGender: 'caregiver_gender',
  preferredLanguage: 'preferred_language',
  preferredChannel: 'preferred_channel',
  childBands: 'child_bands',
};

export class PgParentRepository implements ParentRepository {
  constructor(private readonly db: Queryable) {}

  async create(profile: Omit<ParentProfile, 'id' | 'createdAt'>): Promise<ParentProfile> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const result = await this.db.query<ParentRow>(
      `INSERT INTO parents
        (id, phone_hash, display_alias, district, sector, urban_rural, caregiver_gender,
         preferred_language, preferred_channel, child_bands, role, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        id,
        profile.phoneHash,
        profile.displayAlias ?? null,
        profile.district ?? null,
        profile.sector ?? null,
        profile.urbanRural ?? null,
        profile.caregiverGender ?? null,
        profile.preferredLanguage,
        profile.preferredChannel,
        profile.childBands,
        profile.role,
        createdAt,
      ],
    );
    return mapParent(result.rows[0]!);
  }

  async findById(id: string): Promise<ParentProfile | null> {
    const r = await this.db.query<ParentRow>('SELECT * FROM parents WHERE id = $1', [id]);
    return r.rows[0] ? mapParent(r.rows[0]) : null;
  }

  async findByPhoneHash(phoneHash: string): Promise<ParentProfile | null> {
    const r = await this.db.query<ParentRow>('SELECT * FROM parents WHERE phone_hash = $1', [
      phoneHash,
    ]);
    return r.rows[0] ? mapParent(r.rows[0]) : null;
  }

  async update(id: string, patch: Partial<ParentProfile>): Promise<ParentProfile> {
    const columns: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
      if (key in patch) {
        columns.push(column);
        values.push((patch as Record<string, unknown>)[key]);
      }
    }
    if (columns.length === 0) {
      const current = await this.findById(id);
      if (!current) throw new Error(`parent ${id} not found`);
      return current;
    }
    const setClause = columns.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const r = await this.db.query<ParentRow>(
      `UPDATE parents SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    if (!r.rows[0]) throw new Error(`parent ${id} not found`);
    return mapParent(r.rows[0]);
  }
}

interface ConsentRow {
  id: string;
  parent_id: string;
  purpose: string;
  language: Consent['language'];
  method: Consent['method'];
  given_at: Date | string;
  withdrawn_at: Date | string | null;
}

function mapConsent(row: ConsentRow): Consent {
  const c: Consent = {
    id: row.id,
    parentId: row.parent_id,
    purpose: row.purpose,
    language: row.language,
    method: row.method,
    givenAt: toIso(row.given_at),
  };
  if (row.withdrawn_at != null) c.withdrawnAt = toIso(row.withdrawn_at);
  return c;
}

export class PgConsentRepository implements ConsentRepository {
  constructor(private readonly db: Queryable) {}

  async record(consent: Omit<Consent, 'id'>): Promise<Consent> {
    const id = randomUUID();
    const r = await this.db.query<ConsentRow>(
      `INSERT INTO consents (id, parent_id, purpose, language, method, given_at, withdrawn_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, consent.parentId, consent.purpose, consent.language, consent.method, consent.givenAt, consent.withdrawnAt ?? null],
    );
    return mapConsent(r.rows[0]!);
  }

  async withdraw(parentId: string, purpose: string, at: string): Promise<void> {
    await this.db.query(
      'UPDATE consents SET withdrawn_at = $3 WHERE parent_id = $1 AND purpose = $2 AND withdrawn_at IS NULL',
      [parentId, purpose, at],
    );
  }

  async listForParent(parentId: string): Promise<Consent[]> {
    const r = await this.db.query<ConsentRow>(
      'SELECT * FROM consents WHERE parent_id = $1 ORDER BY given_at',
      [parentId],
    );
    return r.rows.map(mapConsent);
  }
}

interface OtpRow {
  phone_hash: string;
  otp_hash: string;
  expires_at_ms: string | number;
  attempts: number;
}

export class PgOtpRepository implements OtpRepository {
  constructor(private readonly db: Queryable) {}

  async save(record: OtpRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO otps (phone_hash, otp_hash, expires_at_ms, attempts)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (phone_hash)
       DO UPDATE SET otp_hash = EXCLUDED.otp_hash,
                     expires_at_ms = EXCLUDED.expires_at_ms,
                     attempts = EXCLUDED.attempts`,
      [record.phoneHash, record.otpHash, record.expiresAtMs, record.attempts],
    );
  }

  async get(phoneHash: string): Promise<OtpRecord | null> {
    const r = await this.db.query<OtpRow>('SELECT * FROM otps WHERE phone_hash = $1', [phoneHash]);
    const row = r.rows[0];
    if (!row) return null;
    return {
      phoneHash: row.phone_hash,
      otpHash: row.otp_hash,
      expiresAtMs: Number(row.expires_at_ms),
      attempts: row.attempts,
    };
  }

  async delete(phoneHash: string): Promise<void> {
    await this.db.query('DELETE FROM otps WHERE phone_hash = $1', [phoneHash]);
  }
}
