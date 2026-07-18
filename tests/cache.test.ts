import { describe, expect, it } from "vitest";

import { TtlCache } from "../src/cache.js";

function makeClock(startAt = 0): { now: () => number; advance: (ms: number) => void } {
  let t = startAt;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

describe("TtlCache", () => {
  it("returns undefined for a missing key", () => {
    const cache = new TtlCache<string>(10, 1000);
    expect(cache.get("nope")).toBeUndefined();
  });

  it("returns a stored value before expiry", () => {
    const clock = makeClock();
    const cache = new TtlCache<string>(10, 1000, clock.now);
    cache.set("k", "v");
    clock.advance(500);
    expect(cache.get("k")).toBe("v");
  });

  it("expires entries after the TTL", () => {
    const clock = makeClock();
    const cache = new TtlCache<string>(10, 1000, clock.now);
    cache.set("k", "v");
    clock.advance(1001);
    expect(cache.get("k")).toBeUndefined();
  });

  it("evicts the least-recently-used entry when full", () => {
    const cache = new TtlCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    // Touch a to make it most-recent.
    cache.get("a");
    cache.set("c", "3");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
  });

  it("moves an entry to most-recent on a fresh set", () => {
    const cache = new TtlCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("a", "1-updated");
    cache.set("c", "3");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1-updated");
  });
});
