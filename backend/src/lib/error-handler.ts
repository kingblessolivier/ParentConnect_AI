/**
 * Pure error → problem+json mapping (RFC 9457).
 *
 * Extracted from the Fastify handler so every branch is unit-testable without a
 * live server. In production, unexpected (500) errors never expose internal
 * detail to the client (NFR-10).
 */

import { AppError, type Problem, toProblem } from './problem.js';

export interface ProblemResponse {
  status: number;
  problem: Problem;
}

function isValidationError(error: unknown): error is { validation: unknown; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Boolean((error as { validation?: unknown }).validation)
  );
}

export function buildProblemResponse(
  error: unknown,
  instance: string,
  debug: boolean,
): ProblemResponse {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      problem: toProblem(error.statusCode, error.title, error.clientDetail, instance, error.problemType),
    };
  }

  if (isValidationError(error)) {
    return { status: 400, problem: toProblem(400, 'Validation failed', error.message, instance) };
  }

  // Unexpected: expose the message only in debug (never in production, NFR-10).
  const detail = debug && error instanceof Error ? error.message : undefined;
  return { status: 500, problem: toProblem(500, 'Internal Server Error', detail, instance) };
}
