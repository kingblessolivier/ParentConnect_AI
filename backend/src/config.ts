/**
 * Environment configuration with production safety assertions.
 *
 * Production must run with debug disabled (NFR-13). Secrets come from the
 * environment / a secret manager, never from source (NFR-13). This module is
 * the single place config is read and validated so a misconfiguration fails
 * fast at boot rather than leaking later.
 */

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly debug: boolean;
  /** Path to the deployment config bundle (ADR-0010): referral directory, i18n, etc. */
  readonly configDir: string;
  /** Internal URL of the Python AI/RAG service (ADR-0014). */
  readonly aiServiceUrl: string;
  /** Postgres connection string (ADR-0002). When unset, in-memory repos are used. */
  readonly databaseUrl: string | undefined;
  /** Secret for signing session tokens (HS256). Never a default in production. */
  readonly jwtSecret: string;
  /** Keyed pepper for hashing phone numbers (P2). Never a default in production. */
  readonly phonePepper: string;
  /** AES-256 key (64 hex chars) for encrypting recoverable secrets, e.g. phone numbers for outbound SMS. */
  readonly phoneEncKey: string;
  /** OTP time-to-live (FR-01). */
  readonly otpTtlSeconds: number;
  /** Max OTP verification attempts before lockout (FR-01). */
  readonly otpMaxAttempts: number;
  /** Access-token lifetime (short-lived). */
  readonly accessTtlSeconds: number;
  /** Refresh-token lifetime. */
  readonly refreshTtlSeconds: number;
  /** Child-protection referral SLA in hours: due_by = created_at + this (FR-23, D2). */
  readonly referralSlaHours: number;
}

const DEV_JWT_SECRET = 'dev-insecure-jwt-secret';
const DEV_PHONE_PEPPER = 'dev-insecure-phone-pepper';
// 32-byte (64 hex) dev-only key. Production must set a real PHONE_ENC_KEY.
const DEV_PHONE_ENC_KEY = '00000000000000000000000000000000000000000000000000000000000000ff';

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const debug = parseBool(env.DEBUG, nodeEnv !== 'production');

  // Hard safety rail (NFR-13): production may never run with debug enabled.
  if (nodeEnv === 'production' && debug) {
    throw new Error('Refusing to start: DEBUG must be disabled in production (NFR-13).');
  }

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }

  const jwtSecret = env.JWT_SECRET ?? DEV_JWT_SECRET;
  const phonePepper = env.PHONE_PEPPER ?? DEV_PHONE_PEPPER;
  const phoneEncKey = env.PHONE_ENC_KEY ?? DEV_PHONE_ENC_KEY;

  // Never run production on the insecure development secrets (NFR-13).
  if (
    nodeEnv === 'production' &&
    (jwtSecret === DEV_JWT_SECRET ||
      phonePepper === DEV_PHONE_PEPPER ||
      phoneEncKey === DEV_PHONE_ENC_KEY)
  ) {
    throw new Error(
      'Refusing to start: JWT_SECRET, PHONE_PEPPER, and PHONE_ENC_KEY must be set in production (NFR-13).',
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(phoneEncKey)) {
    throw new Error('PHONE_ENC_KEY must be 64 hex characters (32 bytes for AES-256).');
  }

  return {
    nodeEnv,
    port,
    debug,
    configDir: env.CONFIG_DIR ?? 'infra/config/rw-pilot',
    aiServiceUrl: env.AI_SERVICE_URL ?? 'http://localhost:8000',
    databaseUrl: env.DATABASE_URL,
    jwtSecret,
    phonePepper,
    phoneEncKey,
    otpTtlSeconds: Number(env.OTP_TTL_SECONDS ?? 600),
    otpMaxAttempts: Number(env.OTP_MAX_ATTEMPTS ?? 3),
    accessTtlSeconds: Number(env.ACCESS_TTL_SECONDS ?? 900),
    refreshTtlSeconds: Number(env.REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 30),
    referralSlaHours: Number(env.REFERRAL_SLA_HOURS ?? 48),
  };
}
