import { RedisOptions } from 'ioredis';

/**
 * Returns ioredis-compatible configuration for connecting to Redict.
 * Used by BullMQ, CacheService, and any other Redict consumers.
 */
export function getRedictConfig(): RedisOptions {
    const password = process.env.REDICT_PASSWORD || undefined;

    return {
        host: process.env.REDICT_HOST || 'localhost',
        port: parseInt(process.env.REDICT_PORT || '6379', 10),
        password: password || undefined,
        db: parseInt(process.env.REDICT_DB || '0', 10),
        keyPrefix: process.env.REDICT_KEY_PREFIX || 'se:',
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times: number) => Math.min(times * 200, 5000),
        reconnectOnError: (err: Error) => {
            const msg = err.message.toUpperCase();
            return msg.includes('LOADING') || msg.includes('READONLY');
        },
    };
}
