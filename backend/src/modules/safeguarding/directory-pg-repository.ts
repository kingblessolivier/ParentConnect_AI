/**
 * Postgres implementation of the editable referral directory (ADR-0002, FR-33).
 * Overrides only — the file baseline is never stored here (ADR-0010).
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { DirectoryEntry, DirectoryRepository } from './directory-repository.js';
import type { ReferralContact, ReferralType } from './referral-directory.js';

interface DirectoryRow {
  id: string;
  name: string;
  phone: string;
  type: ReferralType;
  district: string | null;
  updated_at: Date | string;
}

const iso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

function mapEntry(row: DirectoryRow): DirectoryEntry {
  const entry: DirectoryEntry = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    type: row.type,
    updatedAt: iso(row.updated_at),
  };
  if (row.district != null) entry.district = row.district;
  return entry;
}

export class PgDirectoryRepository implements DirectoryRepository {
  constructor(private readonly db: Queryable) {}

  async list(): Promise<DirectoryEntry[]> {
    const r = await this.db.query<DirectoryRow>('SELECT * FROM referral_directory ORDER BY name');
    return r.rows.map(mapEntry);
  }

  async create(contact: ReferralContact, at: string): Promise<DirectoryEntry> {
    const r = await this.db.query<DirectoryRow>(
      `INSERT INTO referral_directory (id, name, phone, type, district, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), contact.name, contact.phone, contact.type, contact.district ?? null, at],
    );
    return mapEntry(r.rows[0]!);
  }

  async update(id: string, contact: ReferralContact, at: string): Promise<DirectoryEntry | null> {
    const r = await this.db.query<DirectoryRow>(
      `UPDATE referral_directory
          SET name = $2, phone = $3, type = $4, district = $5, updated_at = $6
        WHERE id = $1
        RETURNING *`,
      [id, contact.name, contact.phone, contact.type, contact.district ?? null, at],
    );
    return r.rows[0] ? mapEntry(r.rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    const r = await this.db.query('DELETE FROM referral_directory WHERE id = $1 RETURNING id', [id]);
    return r.rows.length > 0;
  }
}
