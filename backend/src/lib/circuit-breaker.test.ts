import { describe, it, expect } from 'vitest';
import { CircuitBreaker, withTimeout } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('opens after the failure threshold and short-circuits', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000, now: () => 0 });
    expect(cb.canAttempt()).toBe(true);
    cb.onFailure();
    cb.onFailure();
    expect(cb.currentState).toBe('closed');
    cb.onFailure(); // 3rd -> open
    expect(cb.currentState).toBe('open');
    expect(cb.canAttempt()).toBe(false);
  });

  it('half-opens after the reset timeout, then closes on success', () => {
    let t = 0;
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, now: () => t });
    cb.onFailure(); // open
    expect(cb.canAttempt()).toBe(false);
    t = 1000; // cooled down
    expect(cb.canAttempt()).toBe(true);
    expect(cb.currentState).toBe('half_open');
    cb.onSuccess();
    expect(cb.currentState).toBe('closed');
  });

  it('a success resets the failure count', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000, now: () => 0 });
    cb.onFailure();
    cb.onSuccess();
    cb.onFailure();
    expect(cb.currentState).toBe('closed'); // not open — count was reset
  });
});

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects when the promise is too slow', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 50));
    await expect(withTimeout(slow, 5)).rejects.toThrow(/timed out/);
  });

  it('propagates the underlying rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });
});
