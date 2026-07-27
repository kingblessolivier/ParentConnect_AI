/**
 * Coach orchestrator: calls the AI/RAG service with a timeout + circuit breaker,
 * and degrades gracefully when it's unavailable (NFR-06).
 *
 * Degradation invariant: whatever happens to the AI service, the parent still
 * gets referral information and a clear "I'll answer when I can" message — the
 * referral pathway is never gated by the AI (docs/architecture/channel-design.md).
 * On a crisis flag from the AI, referral info is attached too.
 */

import { CircuitBreaker, withTimeout } from '../../lib/circuit-breaker.js';
import type { ReferralContact } from '../safeguarding/referral-directory.js';
import type { AiClient } from './ai-client.js';
import type { AiCoachRequest, CoachResponse } from './types.js';

const FALLBACK_MESSAGE: Record<string, string> = {
  rw: "Mbabarira, sinshobora gusubiza ako kanya. Nzagusubiza igihe serivisi izaba isubiye gukora. Niba ukeneye ubufasha bwihutirwa, hamagara aba bakurikira.",
  en: "Sorry — I can't answer right now, but I've saved your question and will reply when the service is back. If you need urgent help, please contact the numbers below.",
  fr: "Désolé — je ne peux pas répondre maintenant. J'ai enregistré votre question et je répondrai dès que le service sera rétabli. En cas d'urgence, contactez les numéros ci-dessous.",
};

export interface OrchestratorOptions {
  aiClient: AiClient;
  referralDirectory: readonly ReferralContact[];
  timeoutMs?: number;
  breaker?: CircuitBreaker;
}

export class CoachOrchestrator {
  private readonly aiClient: AiClient;
  private readonly referralDirectory: readonly ReferralContact[];
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;

  constructor(options: OrchestratorOptions) {
    this.aiClient = options.aiClient;
    this.referralDirectory = options.referralDirectory;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.breaker =
      options.breaker ?? new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30_000 });
  }

  async ask(request: AiCoachRequest): Promise<CoachResponse> {
    if (!this.breaker.canAttempt()) {
      return this.degraded(request);
    }
    try {
      const result = await withTimeout(this.aiClient.coach(request), this.timeoutMs);
      this.breaker.onSuccess();
      return {
        answer: result.answer,
        isAi: true,
        safetyFlag: result.safetyFlag,
        citations: result.citations,
        conversationStarters: result.conversationStarters,
        // Attach referral info whenever the AI flags a crisis (FR-21).
        referral: result.safetyFlag === 'crisis' ? [...this.referralDirectory] : null,
        degraded: false,
        queued: false,
      };
    } catch {
      this.breaker.onFailure();
      return this.degraded(request);
    }
  }

  private degraded(request: AiCoachRequest): CoachResponse {
    return {
      answer: FALLBACK_MESSAGE[request.language] ?? FALLBACK_MESSAGE.en!,
      isAi: true,
      safetyFlag: 'degraded',
      citations: [],
      conversationStarters: [],
      // Safe-by-default: always surface referral info during an outage (NFR-06).
      referral: [...this.referralDirectory],
      degraded: true,
      queued: true,
    };
  }
}
