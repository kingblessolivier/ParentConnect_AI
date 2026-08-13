import { describe, it, expect } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('defaults to development with debug on', () => {
    const c = loadConfig({});
    expect(c.nodeEnv).toBe('development');
    expect(c.debug).toBe(true);
    expect(c.port).toBe(3000);
  });

  it('refuses to start in production with debug enabled (NFR-13)', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', DEBUG: 'true' })).toThrow(
      /DEBUG must be disabled/,
    );
  });

  it('allows production with debug off and real secrets set', () => {
    const c = loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 's3cret',
      PHONE_PEPPER: 'p3pper',
      PHONE_ENC_KEY: 'ab'.repeat(32),
    });
    expect(c.nodeEnv).toBe('production');
    expect(c.debug).toBe(false);
  });

  it('refuses production on the insecure dev secrets (NFR-13)', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/must be set in production/);
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: '0' })).toThrow(/Invalid PORT/);
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid PORT/);
  });

  it('reads overrides', () => {
    const c = loadConfig({ PORT: '8080', AI_SERVICE_URL: 'http://ai:8000', CONFIG_DIR: '/x' });
    expect(c.port).toBe(8080);
    expect(c.aiServiceUrl).toBe('http://ai:8000');
    expect(c.configDir).toBe('/x');
  });
});

describe('CORS origins (NFR-10/13)', () => {
  it('defaults to the local console/site ports in development', () => {
    expect(loadConfig({ NODE_ENV: 'development' }).corsOrigins).toEqual([
      'http://localhost:3002',
      'http://localhost:3003',
    ]);
  });

  it('is empty in production until explicitly configured — never a wildcard', () => {
    const c = loadConfig({
      NODE_ENV: 'production',
      DEBUG: 'false',
      JWT_SECRET: 'x'.repeat(32),
      PHONE_PEPPER: 'y'.repeat(32),
      PHONE_ENC_KEY: 'a'.repeat(64),
    });
    expect(c.corsOrigins).toEqual([]);
  });

  it('parses and trims a comma-separated allowlist', () => {
    expect(loadConfig({ CORS_ORIGINS: 'https://console.example.rw, https://admin.example.rw' }).corsOrigins).toEqual([
      'https://console.example.rw',
      'https://admin.example.rw',
    ]);
  });
});
