/**
 * Minimal database access seam.
 *
 * Repositories depend on the tiny `Queryable` interface, not on `pg` directly,
 * so they can be exercised against an in-memory Postgres (pg-mem) in tests and a
 * real pooled connection in production (ADR-0002). Production data is hosted
 * in-region (ADR-0009).
 */

import pg from 'pg';

export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface Queryable {
  query<Row = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<Row>>;
}

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}
