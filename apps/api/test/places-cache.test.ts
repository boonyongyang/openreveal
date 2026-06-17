import { describe, expect, it } from "vitest";

import { DailyBudget, TtlCache } from "../src/places-cache.js";

describe("TtlCache", () => {
  it("returns cached values within the TTL and expires after it", () => {
    let clock = 0;
    const cache = new TtlCache<string>(1_000, 10, () => clock);
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");

    clock += 999;
    expect(cache.get("k")).toBe("v");

    clock += 1;
    expect(cache.get("k")).toBeUndefined();
  });

  it("evicts the least-recently-used entry past maxEntries", () => {
    let clock = 0;
    const cache = new TtlCache<number>(10_000, 2, () => clock);
    cache.set("a", 1);
    cache.set("b", 2);
    // Touch "a" so "b" becomes least-recently-used.
    expect(cache.get("a")).toBe(1);
    cache.set("c", 3);

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });
});

describe("DailyBudget", () => {
  it("treats a non-positive limit as unlimited", () => {
    const budget = new DailyBudget(0);
    for (let index = 0; index < 1_000; index += 1) {
      expect(budget.tryConsume()).toBe(true);
    }
  });

  it("blocks once the daily limit is reached", () => {
    let clock = 0;
    const budget = new DailyBudget(3, () => clock);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
    expect(budget.used).toBe(3);
  });

  it("rolls over at the next day boundary", () => {
    let clock = 0;
    const budget = new DailyBudget(1, () => clock);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);

    clock += 86_400_000;
    expect(budget.tryConsume()).toBe(true);
  });
});
