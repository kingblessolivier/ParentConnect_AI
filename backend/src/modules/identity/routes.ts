/**
 * Identity & consent routes (plugin). Wires the in-memory repositories +
 * services for now; the Postgres repositories drop in behind the same
 * interfaces in the next slice.
 *
 * Endpoints (api-spec.md): OTP request/verify, /me get+update, assisted
 * onboarding, consent record+withdraw.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config.js';
import { AppError } from '../../lib/problem.js';
import { authenticate, requireRole, type AuthContext } from './auth.js';
import { ConsentService } from './consent-service.js';
import { ASSISTED_ONBOARDING_ROLES, IdentityService } from './identity-service.js';
import { OtpService } from './otp-service.js';
import {
  InMemoryConsentRepository,
  InMemoryOtpRepository,
  InMemoryParentRepository,
  type ConsentRepository,
  type OtpRepository,
  type ParentRepository,
} from './repository.js';
import { validateConsentInput, validatePhone, validateProfileInput } from './validation.js';

export interface IdentityOptions {
  config: AppConfig;
  /** Overridable for tests / future Postgres wiring. */
  parentRepo?: ParentRepository;
  consentRepo?: ConsentRepository;
  otpRepo?: OtpRepository;
  /** Deterministic OTP for tests. */
  otpGenerator?: () => string;
  /** Test hook: deliver the OTP somewhere instead of an SMS gateway. */
  onOtp?: (phone: string, code: string) => void;
}

function publicProfile(parent: {
  id: string;
  displayAlias?: string;
  district?: string;
  sector?: string;
  urbanRural?: string;
  caregiverGender?: string;
  preferredLanguage: string;
  preferredChannel: string;
  childBands: string[];
}) {
  // Never expose phoneHash / role internals beyond what the client needs.
  return {
    id: parent.id,
    displayAlias: parent.displayAlias ?? null,
    district: parent.district ?? null,
    sector: parent.sector ?? null,
    urbanRural: parent.urbanRural ?? null,
    caregiverGender: parent.caregiverGender ?? null,
    preferredLanguage: parent.preferredLanguage,
    preferredChannel: parent.preferredChannel,
    childBands: parent.childBands,
  };
}

export async function identityRoutes(app: FastifyInstance, opts: IdentityOptions): Promise<void> {
  const parentRepo = opts.parentRepo ?? new InMemoryParentRepository();
  const consentRepo = opts.consentRepo ?? new InMemoryConsentRepository();
  const otpRepo = opts.otpRepo ?? new InMemoryOtpRepository();

  const otpService = new OtpService({
    otpRepo,
    config: opts.config,
    ...(opts.otpGenerator ? { otpGenerator: opts.otpGenerator } : {}),
  });
  const identity = new IdentityService(parentRepo, opts.config);
  const consent = new ConsentService(consentRepo);

  const auth = (request: FastifyRequest): AuthContext => authenticate(request, opts.config.jwtSecret);

  // --- Auth ---
  app.post('/api/v1/auth/otp/request', async (request, reply) => {
    const { phone } = (request.body ?? {}) as { phone?: unknown };
    const validPhone = validatePhone(phone);
    const { code, expiresInSeconds } = await otpService.request(validPhone);
    // In production this hands off to the SMS gateway (ADR-0006). The code is
    // never returned to the caller nor logged in clear.
    opts.onOtp?.(validPhone, code);
    reply.code(202);
    return { expiresInSeconds };
  });

  app.post('/api/v1/auth/otp/verify', async (request) => {
    const { phone, code, profile } = (request.body ?? {}) as {
      phone?: unknown;
      code?: unknown;
      profile?: unknown;
    };
    const validPhone = validatePhone(phone);
    if (typeof code !== 'string' || code.trim() === '') {
      throw new AppError(400, 'Invalid input', 'code is required');
    }
    const { phoneHash } = await otpService.verify(validPhone, code);
    const profileInput = profile === undefined ? {} : validateProfileInput(profile);
    const parent = await identity.registerVerified(phoneHash, profileInput);
    return identity.issueTokens(parent);
  });

  // --- Profile (self) ---
  app.get('/api/v1/me', async (request) => {
    const ctx = auth(request);
    return publicProfile(await identity.getProfile(ctx.parentId));
  });

  app.patch('/api/v1/me', async (request) => {
    const ctx = auth(request);
    const profileInput = validateProfileInput(request.body);
    return publicProfile(await identity.updateProfile(ctx.parentId, profileInput));
  });

  // --- Assisted onboarding (FR-03) ---
  app.post('/api/v1/parents', async (request, reply) => {
    const ctx = auth(request);
    requireRole(ctx, ASSISTED_ONBOARDING_ROLES);
    const body = (request.body ?? {}) as { phone?: unknown; profile?: unknown; consent?: unknown };
    const phone = validatePhone(body.phone);
    const profileInput = body.profile === undefined ? {} : validateProfileInput(body.profile);
    const parent = await identity.assistedOnboard(phone, profileInput);
    if (body.consent !== undefined) {
      await consent.record(parent.id, validateConsentInput(body.consent));
    }
    reply.code(201);
    return publicProfile(parent);
  });

  // --- Consent (NFR-16/17) ---
  app.post('/api/v1/consent', async (request, reply) => {
    const ctx = auth(request);
    const input = validateConsentInput(request.body);
    const recorded = await consent.record(ctx.parentId, input);
    reply.code(201);
    return { id: recorded.id, purpose: recorded.purpose, givenAt: recorded.givenAt };
  });

  app.post('/api/v1/consent/withdraw', async (request) => {
    const ctx = auth(request);
    const { purpose } = (request.body ?? {}) as { purpose?: unknown };
    if (typeof purpose !== 'string' || purpose.trim() === '') {
      throw new AppError(400, 'Invalid input', 'purpose is required');
    }
    await consent.withdraw(ctx.parentId, purpose);
    return { withdrawn: true };
  });
}
