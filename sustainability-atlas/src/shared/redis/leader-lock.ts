import { Redis } from 'ioredis';

/**
 * Single-holder distributed lock used to elect one leader per (role, network).
 *
 * All four elections in this codebase — the sync scheduler, the queue
 * autoscaler, the guardian-sync subscriber and the API's notification scanner —
 * previously hand-rolled the same SET-NX-EX plus GET-compare, and every one of
 * them renewed and released *unconditionally*:
 *
 *   - `EXPIRE key` extends whatever value is there, so an instance that quietly
 *     lost the lock kept pushing out the new holder's TTL.
 *   - `DEL key` on shutdown deletes whoever holds it, so a departing ex-leader
 *     frees the incumbent's lock and hands a third instance a spurious win.
 *
 * Both are read-modify-write races that only bite once more than one instance
 * runs — exactly the configuration horizontal scaling introduces. Renewal and
 * release are therefore compare-and-swap Lua scripts: they act only while this
 * instance is still the recorded holder.
 *
 * Callers must treat `renew()` returning false as "leadership lost" and stand
 * down; `tryAcquire()` will win it back when the holder's TTL lapses.
 */
export class LeaderLock {
    /** Extend the TTL only while we are still the recorded holder. */
    private static readonly RENEW_LUA = `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('EXPIRE', KEYS[1], ARGV[2])
        end
        return 0
    `;

    /** Delete the key only while we are still the recorded holder. */
    private static readonly RELEASE_LUA = `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('DEL', KEYS[1])
        end
        return 0
    `;

    constructor(
        private readonly redis: Redis,
        private readonly key: string,
        private readonly instanceId: string,
        private readonly ttlSeconds = 30,
    ) {}

    /**
     * Wins the lock, or confirms we already hold it. The GET-compare fallback
     * makes this idempotent for a holder re-checking its own leadership.
     */
    async tryAcquire(): Promise<boolean> {
        const acquired = await this.redis.set(
            this.key, this.instanceId, 'EX', this.ttlSeconds, 'NX',
        );
        if (acquired === 'OK') return true;
        return (await this.redis.get(this.key)) === this.instanceId;
    }

    /**
     * Extends our hold. Returns false when someone else now owns the key —
     * the caller has lost leadership and must stop doing leader-only work.
     */
    async renew(): Promise<boolean> {
        const extended = await this.redis.eval(
            LeaderLock.RENEW_LUA, 1, this.key, this.instanceId, String(this.ttlSeconds),
        );
        return extended === 1;
    }

    /** Releases only our own hold. Safe to call when we never held the lock. */
    async release(): Promise<void> {
        await this.redis.eval(
            LeaderLock.RELEASE_LUA, 1, this.key, this.instanceId,
        );
    }
}
