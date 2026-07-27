import { describe, it, expect } from 'vitest';
import { createPool } from './db.js';

describe('createPool', () => {
  it('constructs a pool without connecting', async () => {
    const pool = createPool('postgres://user:pass@localhost:5432/db');
    expect(pool).toBeTruthy();
    await pool.end();
  });
});
