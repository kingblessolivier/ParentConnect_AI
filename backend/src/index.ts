/**
 * ParentConnect AI backend entrypoint (Fastify, ADR-0017).
 *
 * Loads config (with production safety assertions), wires persistence
 * (Postgres when DATABASE_URL is set — ADR-0002), builds the app, and listens.
 */

import { buildApp, type AppDeps } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './lib/db.js';
import { runMigrations } from './lib/migrate.js';
import { PgContentRepository } from './modules/content/pg-repository.js';
import {
  PgConsentRepository,
  PgOtpRepository,
  PgParentRepository,
} from './modules/identity/pg-repository.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const deps: AppDeps = {};
  if (config.databaseUrl) {
    const pool = createPool(config.databaseUrl);
    await runMigrations(pool, 'migrations');
    deps.identity = {
      parentRepo: new PgParentRepository(pool),
      consentRepo: new PgConsentRepository(pool),
      otpRepo: new PgOtpRepository(pool),
    };
    deps.content = { contentRepo: new PgContentRepository(pool) };
  }

  const app = await buildApp(config, deps);
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(
    `parentconnect-backend listening on :${config.port} (${config.nodeEnv}, ` +
      `db=${config.databaseUrl ? 'postgres' : 'in-memory'})`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
