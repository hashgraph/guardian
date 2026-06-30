/**
 * Bounded TTL + LRU cache.
 *
 * Map preserves insertion order, so the first key is the least-recently-used
 * entry. On `get`/`set` the touched key is re-inserted to refresh its recency.
 * Entries expire after `ttlMs`; the cache never grows past `maxSize`.
 */
export class TTLCache<K, V> {
    private readonly store = new Map<K, { value: V; expires: number }>();
    private readonly inflight = new Map<K, Promise<V>>();
    private readonly maxSize: number;
    private readonly ttlMs: number;

    constructor(maxSize: number = 500, ttlMs: number = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }

    /**
     * Get a cached value, or undefined if missing/expired.
     */
    public get(key: K): V | undefined {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expires <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        // Refresh recency.
        this.store.delete(key);
        this.store.set(key, entry);
        return entry.value;
    }

    /**
     * Store a value, evicting the least-recently-used entry if full.
     */
    public set(key: K, value: V): void {
        if (this.store.has(key)) {
            this.store.delete(key);
        } else if (this.store.size >= this.maxSize) {
            const oldest = this.store.keys().next().value;
            if (oldest !== undefined) {
                this.store.delete(oldest);
            }
        }
        this.store.set(key, { value, expires: Date.now() + this.ttlMs });
    }

    /**
     * Return the cached value or run `loader` once, caching its result.
     * Concurrent calls for the same key share a single in-flight promise,
     * so a batch of N lookups for one key triggers a single load.
     * Null/undefined results are not cached so missing data is re-checked.
     */
    public async getOrLoad(key: K, loader: () => Promise<V>): Promise<V> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const existing = this.inflight.get(key);
        if (existing) {
            return existing;
        }
        const promise = (async () => {
            const value = await loader();
            if (value !== undefined && value !== null) {
                this.set(key, value);
            }
            return value;
        })();
        this.inflight.set(key, promise);
        try {
            return await promise;
        } finally {
            this.inflight.delete(key);
        }
    }

    /**
     * Remove a single entry.
     */
    public delete(key: K): void {
        this.store.delete(key);
    }

    /**
     * Drop all cached entries.
     */
    public clear(): void {
        this.store.clear();
        this.inflight.clear();
    }
}
