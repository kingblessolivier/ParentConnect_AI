/**
 * Tiny forward-only migration runner.
 *
 * Applies `migrations/*.sql` in filename order, once each, tracked in a
 * `_migrations` table. Boring on purpose (no external migration framework):
 * plain SQL files a DBA can read and a small team can reason about.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Queryable } from './db.js';

export function migrationFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function runMigrations(db: Queryable, dir: string): Promise<string[]> {
  // Create the tracking table only when absent. (Guarding via information_schema
  // rather than `CREATE TABLE IF NOT EXISTS` keeps this re-runnable everywhere.)
  const exists = await db.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations'",
  );
  if (exists.rows.length === 0) {
    await db.query(
      'CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL)',
    );
  }
  const applied = new Set(
    (await db.query<{ name: string }>('SELECT name FROM _migrations')).rows.map((r) => r.name),
  );

  const ran: string[] = [];
  for (const file of migrationFiles(dir)) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    await db.query(sql);
    await db.query('INSERT INTO _migrations (name, applied_at) VALUES ($1, $2)', [
      file,
      new Date().toISOString(),
    ]);
    ran.push(file);
  }
  return ran;
}
