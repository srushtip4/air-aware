export class CircuitOpenError extends Error {
  public readonly retryAfterMs: number;

  constructor(name: string, retryAfterMs: number) {
    super(`Circuit breaker "${name}" is open; upstream temporarily bypassed.`);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class UpstreamTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Upstream request timed out after ${timeoutMs}ms`);
    this.name = 'UpstreamTimeoutError';
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
}

export class CircuitBreaker {
  public readonly name: string;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.now = options.now ?? (() => Date.now());
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && this.now() - this.openedAt >= this.cooldownMs) {
      return 'HALF_OPEN';
    }
    return this.state;
  }

  public async execute<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      const remaining = Math.max(0, this.cooldownMs - (this.now() - this.openedAt));
      throw new CircuitOpenError(this.name, remaining);
    }

    if (currentState === 'HALF_OPEN') {
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openedAt = 0;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  private recordFailure(): void {
    this.consecutiveFailures += 1;
    if (
      this.state === 'HALF_OPEN' ||
      this.consecutiveFailures >= this.failureThreshold
    ) {
      this.state = 'OPEN';
      this.openedAt = this.now();
    }
  }
}

export interface RetryTimeoutOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown) => boolean;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof CircuitOpenError) {
    return false;
  }
  if (error instanceof UpstreamTimeoutError) {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number') {
      return status === 429 || status >= 500;
    }
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status === 429 || status >= 500;
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('429') ||
      msg.includes('503')
    );
  }
  return false;
}

export async function withTimeout<TResult>(
  fn: (signal: AbortSignal) => Promise<TResult>,
  timeoutMs: number,
): Promise<TResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new UpstreamTimeoutError(timeoutMs));
        controller.abort();
      }, timeoutMs);
    });

    return await Promise.race([fn(controller.signal), timeoutPromise]);
  } catch (err) {
    if (timedOut) {
      throw new UpstreamTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export async function withRetryAndTimeout<TResult>(
  fn: (signal: AbortSignal) => Promise<TResult>,
  options: RetryTimeoutOptions = {},
): Promise<TResult> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 150;
  const sleepFn = options.sleepFn ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? isTransientError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await withTimeout(fn, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries || !shouldRetry(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** attempt;
      await sleepFn(delay);
    }
  }

  throw lastError;
}
