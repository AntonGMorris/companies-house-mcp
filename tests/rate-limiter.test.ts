import { describe, expect, it } from "vitest";

import { RateLimiter } from "../src/rate-limiter.js";

function makeClock(startAt = 0): { now: () => number; advance: (ms: number) => void } {
  let t = startAt;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

describe("RateLimiter", () => {
  it("allows requests up to the limit without waiting", async () => {
    const clock = makeClock();
    const limiter = new RateLimiter(3, 1000, clock.now, () => Promise.resolve());
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.available()).toBe(0);
  });

  it("evicts old requests once they fall out of the window", async () => {
    const clock = makeClock();
    const limiter = new RateLimiter(2, 1000, clock.now, () => Promise.resolve());
    await limiter.acquire();
    clock.advance(500);
    await limiter.acquire();
    expect(limiter.available()).toBe(0);

    clock.advance(600); // now the first is expired, second still in window
    expect(limiter.available()).toBe(1);
  });

  it("waits until a slot frees up when saturated", async () => {
    const clock = makeClock();
    const sleeps: number[] = [];
    const sleep = (ms: number): Promise<void> => {
      sleeps.push(ms);
      clock.advance(ms);
      return Promise.resolve();
    };
    const limiter = new RateLimiter(1, 1000, clock.now, sleep);

    await limiter.acquire();
    await limiter.acquire();

    expect(sleeps.length).toBe(1);
    expect(sleeps[0]).toBeGreaterThan(0);
  });

  it("rejects invalid config", () => {
    expect(() => new RateLimiter(0, 1000)).toThrow();
    expect(() => new RateLimiter(1, 0)).toThrow();
  });
});
