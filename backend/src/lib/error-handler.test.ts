import { describe, it, expect } from 'vitest';
import { buildProblemResponse } from './error-handler.js';
import { AppError } from './problem.js';

describe('buildProblemResponse', () => {
  it('maps an AppError to its status and title', () => {
    const { status, problem } = buildProblemResponse(
      new AppError(403, 'Forbidden', 'no'),
      '/x',
      false,
    );
    expect(status).toBe(403);
    expect(problem).toMatchObject({ status: 403, title: 'Forbidden', detail: 'no', instance: '/x' });
  });

  it('maps a Fastify validation error to 400', () => {
    const { status, problem } = buildProblemResponse(
      { validation: [{ message: 'bad' }], message: 'querystring bad' },
      '/x',
      false,
    );
    expect(status).toBe(400);
    expect(problem.title).toBe('Validation failed');
  });

  it('maps an unexpected error to 500 and hides detail when not debug', () => {
    const { status, problem } = buildProblemResponse(new Error('secret internals'), '/x', false);
    expect(status).toBe(500);
    expect(problem.detail).toBeUndefined();
  });

  it('exposes the message on 500 only in debug', () => {
    const { problem } = buildProblemResponse(new Error('boom'), '/x', true);
    expect(problem.detail).toBe('boom');
  });
});
