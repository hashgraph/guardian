import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getRedictConfig } from '@shared/config/redict.config';

export interface RateLimitResult {
    allowed: boolean;
    count: number;
    remaining: number;
    resetSeconds: number;
}

/**
 * Thin Redict (Redis) client for app-level caching / rate limiting, separate
 * from the BullMQ connections. Reuses getRedictConfig() (keyPrefix 'se:').
 *
 * rateLimit() runs an ATOMIC fixed-window counter via a Lua script (INCR +
 * PEXPIRE on first hit), so concurrent API instances share one counter with no
 * read-modify-write race. On any Redis error it FAILS OPEN (allows the request)
 * and logs — a cache outage must not take the API down.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis | null = null;

    // INCR the bucket; set the window TTL only on the first hit; return [count, ttlMs].
    private static readonly RATE_LIMIT_LUA = `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
            redis.call('PEXPIRE', KEYS[1], ARGV[1])
        end
        return {current, redis.call('PTTL', KEYS[1])}
    `;

    onModuleInit(): void {
        try {
            this.client = new Redis(getRedictConfig());
            this.client.on('error', (err: Error) => {
                this.logger.error(`Redis connection error: ${err.message}`);
            });
            this.logger.log('Redis client initialised');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to initialise Redis client: ${msg}`);
            this.client = null;
        }
    }

    onModuleDestroy(): void {
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
    }

    // ── Generic cache helpers (fail-safe) ─────────────────────────────────────

    /**
     * Reads a JSON-serialised value from Redis. Returns null on any error or
     * when there is no value — callers MUST fall back to the authoritative source.
     * NEVER fails open for security-sensitive callers (authz cache misses must
     * trigger a DB re-check, not a permissive default).
     */
    async getJson<T>(key: string): Promise<T | null> {
        if (!this.client) return null;
        try {
            const raw = await this.client.get(key);
            if (raw === null) return null;
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    /**
     * Serialises `value` to JSON and stores it with an absolute TTL (seconds).
     * Swallows all errors — a cache-write failure must never break the caller.
     */
    async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            // Swallow — cache-write failure is non-fatal.
        }
    }

    /**
     * Deletes a key from Redis. Used for explicit cache invalidation.
     * Swallows all errors.
     */
    async del(key: string): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.del(key);
        } catch {
            // Swallow — invalidation failure is non-fatal (TTL will expire the entry).
        }
    }

    /**
     * Atomically sets `key` only if it does not already exist, with a TTL (SET NX EX).
     * Returns true when THIS call created it — used to throttle a best-effort side
     * effect (e.g. api-key lastUsedAt) to at most once per window. Returns true when
     * there is no client / on error, so the side effect is never wrongly suppressed.
     */
    async setIfAbsent(key: string, ttlSeconds: number): Promise<boolean> {
        if (!this.client) return true;
        try {
            const res = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
            return res === 'OK';
        } catch {
            return true;
        }
    }

    /**
     * Atomic fixed-window rate limit. `key` is namespaced (the client adds the
     * 'se:' prefix). Returns the decision + remaining + reset. FAILS OPEN on error.
     */
    async rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
        if (!this.client) {
            return { allowed: true, count: 0, remaining: limit, resetSeconds: windowSeconds };
        }
        try {
            const [count, ttlMs] = (await this.client.eval(
                RedisService.RATE_LIMIT_LUA,
                1,
                key,
                String(windowSeconds * 1000),
            )) as [number, number];

            return {
                allowed: count <= limit,
                count,
                remaining: Math.max(0, limit - count),
                resetSeconds: ttlMs > 0 ? Math.ceil(ttlMs / 1000) : windowSeconds,
            };
        } catch (err: unknown) {
            // Fail OPEN — never break the API because the rate-limit store is down.
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`rateLimit Redis error (failing open): ${msg}`);
            return { allowed: true, count: 0, remaining: limit, resetSeconds: windowSeconds };
        }
    }
}
