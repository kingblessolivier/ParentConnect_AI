/**
 * RFC 9457 problem+json errors (see docs/architecture/api-spec.md).
 *
 * Every error response is `application/problem+json`. In production, unexpected
 * (500) errors never leak internal detail to the client (NFR-10).
 */

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/** A deliberate, client-safe error a handler can throw. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly title: string;
  readonly problemType: string;
  readonly clientDetail: string | undefined;

  constructor(statusCode: number, title: string, detail?: string, problemType = 'about:blank') {
    super(detail ?? title);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.title = title;
    this.clientDetail = detail;
    this.problemType = problemType;
  }
}

export function toProblem(
  statusCode: number,
  title: string,
  detail: string | undefined,
  instance: string,
  type = 'about:blank',
): Problem {
  const problem: Problem = { type, title, status: statusCode, instance };
  if (detail) problem.detail = detail;
  return problem;
}
