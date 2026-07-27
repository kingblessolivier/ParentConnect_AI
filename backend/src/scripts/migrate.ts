/**
 * Standalone migration runner: `npm run migrate`.
 * Applies pending SQL migrations against DATABASE_URL, then exits.
 */

import { loadConfig } from '../config.js';
import { createPool } from '../lib/db.js';
import { runMigrations } from '../lib/migrate.js';

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required to run migrations');
  const pool = createPool(config.databaseUrl);
  const applied = await runMigrations(pool, 'migrations');
  // eslint-disable-next-line no-console
  console.log(applied.length ? `applied: ${applied.join(', ')}` : 'no pending migrations');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
