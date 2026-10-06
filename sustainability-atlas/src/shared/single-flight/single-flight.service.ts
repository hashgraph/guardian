import { Injectable } from '@nestjs/common';

/**
 * Collapses concurrent cache-miss recomputes that share a key into one shared
 * promise, so a TTL expiry under load triggers one DB round trip instead of
 * one per waiting request. Self-bounding: an entry exists only for the
 * duration of its own computation and is removed as soon as it settles, so
 * this never needs an LRU/max-entries cap the way a value cache would.
 *
 * Process-local by design — it only needs to collapse the requests that land
 * on the same process in the same in-flight window; duplicate computations
 * across API replicas are bounded by replica count, which is an acceptable,
 * much smaller cost than one per concurrent request.
 */
@Injectable()
export class SingleFlightService {
    private readonly inFlight = new Map<string, Promise<unknown>>();

    async run<T>(key: string, compute: () => Promise<T>): Promise<T> {
        const existing = this.inFlight.get(key);
        if (existing) return existing as Promise<T>;

        const promise = compute().finally(() => this.inFlight.delete(key));
        this.inFlight.set(key, promise);
        return promise as Promise<T>;
    }
}
