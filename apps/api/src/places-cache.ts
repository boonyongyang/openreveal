// Cost controls for the upstream Google Places proxy. Identical lookups are
// served from an in-memory TTL cache instead of re-billing Google, and a daily
// budget caps total upstream calls so a leaked passphrase cannot run up an
// unbounded bill.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency for the simple insertion-order LRU eviction below.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

export class DailyBudget {
  private count = 0;
  private day: number;

  constructor(
    private readonly limit: number,
    private readonly now: () => number = Date.now
  ) {
    this.day = this.currentDay();
  }

  private currentDay(): number {
    return Math.floor(this.now() / 86_400_000);
  }

  private rollover(): void {
    const today = this.currentDay();
    if (today !== this.day) {
      this.day = today;
      this.count = 0;
    }
  }

  /** True when another upstream call is allowed. 0 limit means unlimited. */
  tryConsume(): boolean {
    if (this.limit <= 0) return true;
    this.rollover();
    if (this.count >= this.limit) return false;
    this.count += 1;
    return true;
  }

  get used(): number {
    this.rollover();
    return this.count;
  }
}
