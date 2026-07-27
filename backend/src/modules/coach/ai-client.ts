/**
 * Client for the internal Python AI/RAG service (ADR-0014).
 *
 * No PII is sent — only the question, language, and age band (ADR-0004). The
 * orchestrator wraps calls with a timeout + circuit breaker, so this client
 * stays a thin transport.
 */

import type { AiCoachRequest, AiCoachResult } from './types.js';

export interface AiClient {
  coach(request: AiCoachRequest): Promise<AiCoachResult>;
}

type FetchLike = typeof fetch;

export class HttpAiClient implements AiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async coach(request: AiCoachRequest): Promise<AiCoachResult> {
    const res = await this.fetchImpl(`${this.baseUrl}/coach`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`AI service responded ${res.status}`);
    return (await res.json()) as AiCoachResult;
  }
}
