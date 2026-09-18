import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import { envInt } from '@shared/config/bullmq.config';

const logger = new Logger('RedisHeadroom');

/**
 * Producer-side backpressure for the paths that enqueue in bulk.
 *
 * Redict runs with `maxmemory-policy noeviction`, which is correct for BullMQ —
 * silently evicting job hashes would corrupt queues. The flip side is that once
 * `maxmemory` is reached Redict starts refusing writes outright, so `queue.add()`
 * throws instead of degrading, and that unit of work is simply lost.
 *
 * The mass producers (boot backfills, a whole-subtree VC fetch, admin
 * reparse-everything) can each inject an unbounded number of jobs, and none of
 * them previously looked at how much room was left. These helpers let a producer
 * check first and defer: the reconciler and the next boot will pick the work up
 * again, which is strictly better than losing it at the Redis boundary.
 */

export interface HeadroomStatus {
    ok: boolean;
    usedBytes: number;
    maxBytes: number;
    /** Fraction of maxmemory in use, or 0 when no limit is configured. */
    usedFraction: number;
}

function parseInfoMemory(info: string): { usedBytes: number; maxBytes: number } {
    let usedBytes = 0;
    let maxBytes = 0;
    for (const line of info.split('\n')) {
        const [key, rawValue] = line.split(':');
        if (key === 'used_memory') usedBytes = parseInt(rawValue, 10) || 0;
        else if (key === 'maxmemory') maxBytes = parseInt(rawValue, 10) || 0;
    }
    return { usedBytes, maxBytes };
}

/**
 * Reads Redict's current memory use. Never throws — a failed check reports
 * healthy, because losing the ability to read INFO must not stop ingestion.
 */
export async function getHeadroom(
    redis: Redis,
    thresholdPercent = envInt('REDIS_HEADROOM_THRESHOLD_PCT', 85),
): Promise<HeadroomStatus> {
    try {
        const { usedBytes, maxBytes } = parseInfoMemory(await redis.info('memory'));
        // No maxmemory configured means nothing to run out of, as far as this check goes.
        if (maxBytes <= 0) {
            return { ok: true, usedBytes, maxBytes: 0, usedFraction: 0 };
        }
        const usedFraction = usedBytes / maxBytes;
        return {
            ok: usedFraction * 100 < thresholdPercent,
            usedBytes,
            maxBytes,
            usedFraction,
        };
    } catch (error) {
        logger.warn(`Could not read Redis memory: ${(error as Error).message}`);
        return { ok: true, usedBytes: 0, maxBytes: 0, usedFraction: 0 };
    }
}

/**
 * True when it is safe to inject a batch of jobs: Redict has memory headroom
 * AND the target queue is not already deeper than MAX_QUEUE_DEPTH.
 *
 * The depth check counts `prioritized` as well as `wait`. getWaitingCount()
 * alone reports 0 for a queue whose producers all set a priority no matter how
 * deep it is, which is exactly how a ~1M-job message backlog stayed invisible.
 */
export async function canEnqueueBulk(
    redis: Redis,
    queue: Queue,
    label: string,
): Promise<boolean> {
    const headroom = await getHeadroom(redis);
    if (!headroom.ok) {
        logger.warn(
            `${label}: deferring — Redis at ${(headroom.usedFraction * 100).toFixed(1)}% of maxmemory`,
        );
        return false;
    }

    const maxDepth = envInt('MAX_QUEUE_DEPTH', 50_000);
    if (maxDepth <= 0) return true;

    try {
        const [waiting, prioritized] = await Promise.all([
            queue.getWaitingCount(),
            queue.getPrioritizedCount(),
        ]);
        const depth = waiting + prioritized;
        if (depth >= maxDepth) {
            logger.warn(`${label}: deferring — ${queue.name} already holds ${depth} pending job(s)`);
            return false;
        }
    } catch (error) {
        logger.warn(`${label}: depth check failed: ${(error as Error).message}`);
    }
    return true;
}
