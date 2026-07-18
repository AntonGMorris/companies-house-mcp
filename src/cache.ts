/**
 * Small LRU cache with per-entry TTL. In-memory, single-process.
 *
 * The Map preserves insertion order — on hit we delete-then-set to move the
 * key to the most-recently-used end. Eviction removes the least-recent
 * (front-of-map) key when we grow past maxEntries.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly defaultTtlMs: number,
    private readonly clock: () => number = Date.now,
  ) {
    if (maxEntries <= 0) throw new Error("maxEntries must be > 0");
    if (defaultTtlMs <= 0) throw new Error("defaultTtlMs must be > 0");
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.clock()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs?: number): void {
    const expiresAt = this.clock() + (ttlMs ?? this.defaultTtlMs);
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt });
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
