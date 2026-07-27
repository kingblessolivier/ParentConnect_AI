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

  it('allows production with debug off by default', () => {
    const c = loadConfig({ NODE_ENV: 'production' });
    expect(c.nodeEnv).toBe('production');
    expect(c.debug).toBe(false);
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
