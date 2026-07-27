import { describe, it, expect } from 'vitest';
import { AppError, toProblem } from './problem.js';

describe('AppError', () => {
  it('carries status, title, and client detail', () => {
    const e = new AppError(403, 'Forbidden', 'not allowed');
    expect(e.statusCode).toBe(403);
    expect(e.title).toBe('Forbidden');
    expect(e.clientDetail).toBe('not allowed');
    expect(e.problemType).toBe('about:blank');
  });
});

describe('toProblem', () => {
  it('builds an RFC 9457 problem object', () => {
    expect(toProblem(404, 'Not Found', 'no route', '/y')).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/y',
      detail: 'no route',
    });
  });

  it('omits detail when not provided', () => {
    const p = toProblem(500, 'Internal Server Error', undefined, '/y');
    expect(p.detail).toBeUndefined();
    expect(p.status).toBe(500);
  });
});
