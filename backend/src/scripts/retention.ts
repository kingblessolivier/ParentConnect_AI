/**
 * Standalone retention job: `npm run retention` (NFR-19).
 *
 * Intended to be run on a schedule (cron/worker). Applies the ratified
 * retention schedule, prints what it removed, and exits non-zero on failure so
 * a scheduler surfaces the problem rather than silently skipping a purge.
 *
 * Deletions are audit-logged as counts only — never content (NFR-11/15).
 */

import { loadConfig } from '../config.js';
import { createPool } from '../lib/db.js';
import { PgAuditRepository } from '../modules/audit/pg-repository.js';
import { AuditService } from '../modules/audit/service.js';
import { InMemoryAuditRepository } from '../modules/audit/repository.js';
import { PgOtpRepository } from '../modules/identity/pg-repository.js';
import { InMemoryOtpRepository, type OtpRepository } from '../modules/identity/repository.js';
import { RetentionService } from '../modules/retention/service.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = config.databaseUrl ? createPool(config.databaseUrl) : null;

  // Without a database there is nothing persisted to purge; the job still runs
  // so its coverage report is available in local/dev runs.
  const otpRepo: OtpRepository = pool ? new PgOtpRepository(pool) : new InMemoryOtpRepository();
  const audit = new AuditService(pool ? new PgAuditRepository(pool) : new InMemoryAuditRepository());

  const report = await new RetentionService({ otpRepo, audit }).run();

  /* eslint-disable no-console */
  console.log(`retention run ${report.ranAt} — removed ${report.totalRemoved}`);
  for (const applied of report.applied) console.log(`  ${applied.data}: ${applied.removed}`);
  if (report.notEnforced.length > 0) {
    console.log('  not enforced yet (no data to act on):');
    for (const rule of report.notEnforced) console.log(`    ${rule.data} — ${rule.note}`);
  }
  /* eslint-enable no-console */

  await pool?.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
