/**
 * ParentConnect AI backend entrypoint (scaffold).
 *
 * This is a structural placeholder only — no feature logic yet. The concrete
 * HTTP framework (NestJS vs Fastify) is decided in a Phase-1 spike (ADR-0014).
 * Feature modules (identity, coach orchestrator, content, safeguarding,
 * sessions, m&e, admin) land in Phase 1 per docs/delivery/roadmap.md.
 *
 * The coach orchestrator calls the Python AI/RAG service over an internal
 * HTTP/JSON API (ADR-0014); nothing here answers health questions directly.
 */

export const APP_NAME = 'parentconnect-backend';

function main(): void {
  // eslint-disable-next-line no-console
  console.log(`${APP_NAME}: scaffold. See docs/delivery/roadmap.md Phase 1.`);
}

// Only run when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
