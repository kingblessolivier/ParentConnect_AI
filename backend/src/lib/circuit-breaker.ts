/**
 * A minimal circuit breaker.
 *
 * Wraps calls to the AI/RAG service so a slow or failing dependency degrades
 * gracefully instead of hanging every request (NFR-06). After
 * `failureThreshold` consecutive failures the circuit opens and calls are
 * short-circuited until `resetTimeoutMs` elapses, then a single trial is allowed
 * (half-open) before closing again on success.
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  now?: () => number;
}

export type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = 'closed';
  private openedAt = 0;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? (() => Date.now());
  }

  /** May a call be attempted now? Transitions open → half-open when cooled down. */
  canAttempt(): boolean {
    if (this.state === 'open') {
      if (this.now() - this.openedAt >= this.options.resetTimeoutMs) {
        this.state = 'half_open';
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure(): void {
    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = this.now();
    }
  }

  get currentState(): CircuitState {
    return this.state;
  }
}

/** Reject if `promise` doesn't settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}
