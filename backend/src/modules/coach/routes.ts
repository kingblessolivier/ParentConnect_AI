/**
 * Coach routes (plugin). Stateless for this slice: a conversation id is minted
 * for client-side grouping; P3 message persistence (with retention controls,
 * NFR-19) is a deliberate later slice.
 *
 * api-spec.md: POST /conversations, POST /conversations/{id}/messages.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { AppError } from '../../lib/problem.js';
import { authenticate } from '../identity/auth.js';
import { AGE_BANDS, LANGUAGES, type AgeBand, type Language } from '../identity/types.js';
import { loadReferralDirectory } from '../safeguarding/referral-directory.js';
import { HttpAiClient, type AiClient } from './ai-client.js';
import { CoachOrchestrator } from './orchestrator.js';

export interface CoachOptions {
  config: AppConfig;
  /** Injectable for tests / a custom transport. */
  aiClient?: AiClient;
}

export async function coachRoutes(app: FastifyInstance, opts: CoachOptions): Promise<void> {
  const aiClient = opts.aiClient ?? new HttpAiClient(opts.config.aiServiceUrl);
  const referralDirectory = loadReferralDirectory(opts.config.configDir);
  const orchestrator = new CoachOrchestrator({ aiClient, referralDirectory });

  app.post('/api/v1/conversations', async (request, reply) => {
    authenticate(request, opts.config.jwtSecret);
    reply.code(201);
    return { id: randomUUID() };
  });

  app.post('/api/v1/conversations/:id/messages', async (request) => {
    authenticate(request, opts.config.jwtSecret);
    const body = (request.body ?? {}) as { message?: unknown; language?: unknown; ageBand?: unknown };

    if (typeof body.message !== 'string' || body.message.trim() === '') {
      throw new AppError(400, 'Invalid input', 'message is required');
    }
    let language: Language = 'rw';
    if (body.language !== undefined) {
      if (!LANGUAGES.includes(body.language as Language)) {
        throw new AppError(400, 'Invalid input', 'language must be one of rw, en, fr');
      }
      language = body.language as Language;
    }
    let ageBand: AgeBand | undefined;
    if (body.ageBand !== undefined) {
      if (!AGE_BANDS.includes(body.ageBand as AgeBand)) {
        throw new AppError(400, 'Invalid input', 'ageBand must be one of 10_12, 13_15, 16_19');
      }
      ageBand = body.ageBand as AgeBand;
    }

    // No PII crosses to the AI service — only the question + language + band.
    return orchestrator.ask({
      question: body.message,
      language,
      ...(ageBand ? { ageBand } : {}),
    });
  });
}
