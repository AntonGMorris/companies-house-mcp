/**
 * Sliding-window rate limiter tuned to Companies House's published limit of
 * 600 requests per 5-minute rolling window per API key.
 *
 * `acquire()` returns a promise that resolves when the caller is cleared to
 * make a request. If the current window is full it waits until the oldest
 * recorded request falls out of the window.
 */
export class RateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly clock: () => number = Date.now,
    private readonly sleeper: (ms: number) => Promise<void> = defaultSleep,
  ) {
    if (maxRequests <= 0) throw new Error("maxRequests must be > 0");
    if (windowMs <= 0) throw new Error("windowMs must be > 0");
  }

  async acquire(): Promise<void> {
    for (;;) {
      const now = this.clock();
      this.evict(now);
      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0]!;
      const waitMs = oldest + this.windowMs - now;
      await this.sleeper(Math.max(waitMs, 1));
    }
  }

  /** For diagnostics: how many slots are still free right now. */
  available(): number {
    this.evict(this.clock());
    return this.maxRequests - this.timestamps.length;
  }

  private evict(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0]! <= cutoff) {
      this.timestamps.shift();
    }
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
