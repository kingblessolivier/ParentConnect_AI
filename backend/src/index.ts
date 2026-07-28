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
import { LogGateway } from './modules/messaging/gateway.js';
import { PgNudgeRepository } from './modules/nudges/pg-repository.js';
import { PgAssessmentRepository } from './modules/me/pg-repository.js';
import { PgSessionRepository } from './modules/sessions/pg-repository.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const deps: AppDeps = {};
  if (config.databaseUrl) {
    const pool = createPool(config.databaseUrl);
    await runMigrations(pool, 'migrations');
    const parentRepo = new PgParentRepository(pool);
    deps.identity = {
      parentRepo,
      consentRepo: new PgConsentRepository(pool),
      otpRepo: new PgOtpRepository(pool),
    };
    deps.content = { contentRepo: new PgContentRepository(pool) };
    // Nudges share the same parent repo for segmentation; LogGateway until an
    // aggregator is arranged (Q5, ADR-0006).
    deps.nudges = { nudgeRepo: new PgNudgeRepository(pool), parentRepo, gateway: new LogGateway() };
    deps.sessions = { sessionRepo: new PgSessionRepository(pool) };
    deps.me = { assessmentRepo: new PgAssessmentRepository(pool), parentRepo };
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
