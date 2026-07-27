import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../../lib/circuit-breaker.js';
import type { ReferralContact } from '../safeguarding/referral-directory.js';
import type { AiClient } from './ai-client.js';
import { CoachOrchestrator } from './orchestrator.js';
import type { AiCoachResult } from './types.js';

const REFERRALS: ReferralContact[] = [
  { name: 'Isange One Stop Centre', phone: '123', type: 'one_stop_centre' },
];

function fakeAi(impl: (q: string) => Promise<AiCoachResult> | AiCoachResult): AiClient {
  return { coach: async (req) => impl(req.question) };
}

const OK: AiCoachResult = {
  answer: 'grounded answer',
  citations: [{ contentVersionId: 'kb-1', title: 'Puberty' }],
  safetyFlag: 'none',
  conversationStarters: ['Try asking...'],
};

describe('CoachOrchestrator', () => {
  it('returns the grounded AI answer on success (no referral when not crisis)', async () => {
    const orch = new CoachOrchestrator({ aiClient: fakeAi(() => OK), referralDirectory: REFERRALS });
    const res = await orch.ask({ question: 'when does puberty start?', language: 'en' });
    expect(res.isAi).toBe(true);
    expect(res.answer).toBe('grounded answer');
    expect(res.citations).toHaveLength(1);
    expect(res.degraded).toBe(false);
    expect(res.referral).toBeNull();
  });

  it('attaches referral info when the AI flags a crisis (FR-21)', async () => {
    const orch = new CoachOrchestrator({
      aiClient: fakeAi(() => ({ ...OK, safetyFlag: 'crisis' })),
      referralDirectory: REFERRALS,
    });
    const res = await orch.ask({ question: 'my child is being hurt', language: 'en' });
    expect(res.safetyFlag).toBe('crisis');
    expect(res.referral).toHaveLength(1);
  });

  it('degrades gracefully when the AI throws — referral + queued (NFR-06)', async () => {
    const orch = new CoachOrchestrator({
      aiClient: fakeAi(() => {
        throw new Error('AI down');
      }),
      referralDirectory: REFERRALS,
    });
    const res = await orch.ask({ question: 'anything', language: 'rw' });
    expect(res.degraded).toBe(true);
    expect(res.queued).toBe(true);
    expect(res.safetyFlag).toBe('degraded');
    expect(res.referral).toHaveLength(1); // referral always available (NFR-06)
    expect(res.answer).toMatch(/serivisi|Mbabarira/); // Kinyarwanda fallback
  });

  it('short-circuits to degraded once the breaker is open (no AI call)', async () => {
    let calls = 0;
    const orch = new CoachOrchestrator({
      aiClient: fakeAi(() => {
        calls += 1;
        throw new Error('AI down');
      }),
      referralDirectory: REFERRALS,
      breaker: new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000, now: () => 0 }),
    });
    await orch.ask({ question: 'q1', language: 'en' }); // fails -> opens
    await orch.ask({ question: 'q2', language: 'en' }); // short-circuited
    expect(calls).toBe(1); // second call never reached the AI client
  });

  it('times out a slow AI call and degrades', async () => {
    const orch = new CoachOrchestrator({
      aiClient: { coach: () => new Promise<AiCoachResult>((r) => setTimeout(() => r(OK), 100)) },
      referralDirectory: REFERRALS,
      timeoutMs: 5,
    });
    const res = await orch.ask({ question: 'slow', language: 'en' });
    expect(res.degraded).toBe(true);
  });
});
