/**
 * ParentConnect AI backend entrypoint (Fastify, ADR-0017).
 *
 * Loads config (with production safety assertions), builds the app, and listens.
 * Feature modules are registered inside `buildApp`.
 */

import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`parentconnect-backend listening on :${config.port} (${config.nodeEnv})`);
}

// Only run when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
