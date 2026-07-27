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
}

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

  return {
    nodeEnv,
    port,
    debug,
    configDir: env.CONFIG_DIR ?? 'infra/config/rw-pilot',
    aiServiceUrl: env.AI_SERVICE_URL ?? 'http://localhost:8000',
  };
}
