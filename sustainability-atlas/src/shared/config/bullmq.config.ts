/**
 * Base queue names (without network prefix).
 * Actual queue names at runtime are `{baseName}-{network}` so that each
 * Hedera network gets its own queue set and workers never pick up jobs
 * belonging to another network.
 */
export const BASE_QUEUE_NAMES = {
    TOPIC_SYNC: 'mirror-node-topics',
    // Separate from TOPIC_SYNC (which can hold 100k+ routine re-poll jobs) —
    // carries only the root/registry topic and guardian-sync's event syncs.
    TOPIC_SYNC_PRIORITY: 'mirror-node-topics-priority',
    MESSAGE_PARSE: 'mirror-node-messages',
    IPFS_FETCH: 'ipfs-files',
    POLICY_DECODE: 'policy-decode',
    TOKEN_SYNC: 'mirror-node-tokens',
    // Retirement events read from Guardian's RETIRE smart contracts. Separate
    // from TOKEN_SYNC because the unit of work is a contract, not a token.
    RETIRE_SYNC: 'mirror-node-retirements',
    MV_REFRESH: 'maintenance-refresh-mvs',
    BUSINESS_VIEW_BUILD: 'maintenance-build-business-views',
    PROJECT_REPARSE: 'project-reparse',
    // Resolves a published methodology's discontinue state from the Policy
    // messages already ingested for it. Deliberately NOT a `mirror-node-*`
    // queue: the policy topic is already synced by TOPIC_SYNC, so this reads
    // the local `message` table and never calls the mirror node.
    POLICY_STATUS: 'policy-status',
} as const;

export type BaseQueueName = typeof BASE_QUEUE_NAMES[keyof typeof BASE_QUEUE_NAMES];

/**
 * Resolves the current worker's network from HEDERA_NET. Defaults to 'testnet'.
 */
export function getWorkerNetwork(): string {
    return (process.env.HEDERA_NET || 'testnet').toLowerCase();
}

/**
 * Appends the current worker's network to a base queue name.
 * Example: "mirror-node-topics" + "mainnet" → "mirror-node-topics-mainnet"
 */
export function qname(base: BaseQueueName, network?: string): string {
    return `${base}-${network || getWorkerNetwork()}`;
}

/**
 * Fully-qualified queue names for the current worker process.
 * Injectable via `@InjectQueue(QUEUE_NAMES.TOPIC_SYNC)` inside processors.
 */
export const QUEUE_NAMES = {
    TOPIC_SYNC: qname(BASE_QUEUE_NAMES.TOPIC_SYNC),
    TOPIC_SYNC_PRIORITY: qname(BASE_QUEUE_NAMES.TOPIC_SYNC_PRIORITY),
    MESSAGE_PARSE: qname(BASE_QUEUE_NAMES.MESSAGE_PARSE),
    IPFS_FETCH: qname(BASE_QUEUE_NAMES.IPFS_FETCH),
    POLICY_DECODE: qname(BASE_QUEUE_NAMES.POLICY_DECODE),
    TOKEN_SYNC: qname(BASE_QUEUE_NAMES.TOKEN_SYNC),
    RETIRE_SYNC: qname(BASE_QUEUE_NAMES.RETIRE_SYNC),
    MV_REFRESH: qname(BASE_QUEUE_NAMES.MV_REFRESH),
    BUSINESS_VIEW_BUILD: qname(BASE_QUEUE_NAMES.BUSINESS_VIEW_BUILD),
    PROJECT_REPARSE: qname(BASE_QUEUE_NAMES.PROJECT_REPARSE),
    POLICY_STATUS: qname(BASE_QUEUE_NAMES.POLICY_STATUS),
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

/**
 * BullMQ retention spec. `age` (seconds) is what gives a *predictable* jobId
 * dedup window: a bare `count` on a high-throughput queue evicts finished jobs
 * within seconds, which silently frees their jobIds for re-add. `count` stays
 * as the memory ceiling.
 */
export interface KeepJobs {
    /** Maximum age in seconds a finished job is kept. */
    age: number;
    /** Hard ceiling on retained jobs, applied together with `age`. */
    count: number;
}

export interface QueueDefinition {
    name: QueueName;
    defaultJobOptions: {
        attempts: number;
        backoff: {
            type: 'exponential' | 'fixed';
            delay: number;
        };
        removeOnComplete: KeepJobs;
        removeOnFail: KeepJobs;
    };
    concurrency: number;
}

export function envInt(name: string, defaultValue: number): number {
    return parseInt(process.env[name] || String(defaultValue), 10);
}

/**
 * Retention defaults. Completed jobs are pure Redict bloat once their side
 * effects are in Postgres, so they are kept only long enough to serve the
 * dedup window and the dashboard. Failed jobs are kept a week for forensics.
 */
function keepCompleted(envVar: string, count: number): KeepJobs {
    return {
        age: envInt('QUEUE_KEEP_COMPLETED_AGE_S', 3600),
        count: envInt(envVar, count),
    };
}

function keepFailed(envVar: string, count: number): KeepJobs {
    return {
        age: envInt('QUEUE_KEEP_FAILED_AGE_S', 7 * 24 * 3600),
        count: envInt(envVar, count),
    };
}

/**
 * Returns queue definitions with their default job options and concurrency settings.
 */
export function getQueueConfigs(): QueueDefinition[] {
    return [
        {
            name: QUEUE_NAMES.TOPIC_SYNC,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 3000 },
                removeOnComplete: keepCompleted('TOPIC_SYNC_REMOVE_ON_COMPLETE', 1000),
                removeOnFail: keepFailed('TOPIC_SYNC_REMOVE_ON_FAIL', 5000),
            },
            concurrency: envInt('WORKER_TOPIC_CONCURRENCY', 20),
        },
        {
            name: QUEUE_NAMES.TOPIC_SYNC_PRIORITY,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 3000 },
                removeOnComplete: keepCompleted('TOPIC_SYNC_PRIORITY_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('TOPIC_SYNC_PRIORITY_REMOVE_ON_FAIL', 1000),
            },
            concurrency: envInt('WORKER_TOPIC_PRIORITY_CONCURRENCY', 5),
        },
        {
            name: QUEUE_NAMES.MESSAGE_PARSE,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: keepCompleted('MESSAGE_PARSE_REMOVE_ON_COMPLETE', 1000),
                removeOnFail: keepFailed('MESSAGE_PARSE_REMOVE_ON_FAIL', 5000),
            },
            concurrency: envInt('WORKER_MESSAGE_CONCURRENCY', 10),
        },
        {
            name: QUEUE_NAMES.IPFS_FETCH,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: keepCompleted('IPFS_FETCH_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('IPFS_FETCH_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_IPFS_CONCURRENCY', 3),
        },
        {
            name: QUEUE_NAMES.POLICY_DECODE,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: keepCompleted('POLICY_DECODE_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('POLICY_DECODE_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt(
                'WORKER_POLICY_DECODE_CONCURRENCY',
                envInt('WORKER_POLICY_SCHEMA_CONCURRENCY', 2),
            ),
        },
        {
            name: QUEUE_NAMES.TOKEN_SYNC,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: keepCompleted('TOKEN_SYNC_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('TOKEN_SYNC_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_TOKEN_CONCURRENCY', 2),
        },
        {
            name: QUEUE_NAMES.RETIRE_SYNC,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: keepCompleted('RETIRE_SYNC_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('RETIRE_SYNC_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_RETIRE_CONCURRENCY', 2),
        },
        {
            name: QUEUE_NAMES.MV_REFRESH,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'fixed', delay: 5000 },
                removeOnComplete: keepCompleted('MV_REFRESH_REMOVE_ON_COMPLETE', 100),
                removeOnFail: keepFailed('MV_REFRESH_REMOVE_ON_FAIL', 500),
            },
            concurrency: 1,
        },
        {
            name: QUEUE_NAMES.BUSINESS_VIEW_BUILD,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'fixed', delay: 1000 },
                removeOnComplete: keepCompleted('BUSINESS_VIEW_BUILD_REMOVE_ON_COMPLETE', 100),
                removeOnFail: keepFailed('BUSINESS_VIEW_BUILD_REMOVE_ON_FAIL', 500),
            },
            concurrency: 5,
        },
        {
            name: QUEUE_NAMES.PROJECT_REPARSE,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: keepCompleted('PROJECT_REPARSE_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('PROJECT_REPARSE_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_PROJECT_REPARSE_CONCURRENCY', 5),
        },
        {
            name: QUEUE_NAMES.POLICY_STATUS,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: keepCompleted('POLICY_STATUS_REMOVE_ON_COMPLETE', 500),
                removeOnFail: keepFailed('POLICY_STATUS_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_POLICY_STATUS_CONCURRENCY', 3),
        },
    ];
}

/**
 * BullMQ caps a queue's event stream at 10 000 entries by default. Across
 * 10 queues × N networks that is a six-figure entry count in Redict serving
 * only the dashboard, which never reads more than the recent tail.
 */
export function getEventStreamOptions(): { events: { maxLen: number } } {
    return { events: { maxLen: envInt('QUEUE_EVENTS_MAX_LEN', 1000) } };
}

/**
 * Returns queue registration objects for BullModule.registerQueue(), carrying
 * the FULL default job options (attempts + backoff + retention), not just
 * retention. Without attempts, BullMQ defaults to a single try and any
 * transient mirror-node/IPFS blip permanently drops that unit of work.
 */
export function getQueueRegistrations(): Array<{
    name: string;
    defaultJobOptions?: object;
    streams?: { events: { maxLen: number } };
}> {
    return getQueueConfigs().map((q) => ({
        name: q.name,
        defaultJobOptions: q.defaultJobOptions,
        streams: getEventStreamOptions(),
    }));
}

/**
 * Per-queue BullMQ Worker runtime options.
 *
 * `lockDuration` must exceed the realistic worst-case runtime of a single job:
 * BullMQ's 30 s default combined with `maxStalledCount: 1` means a job that
 * blocks longer than the lock is reclaimed once and then permanently failed.
 * These values are sized from each processor's actual work (mirror-node pages,
 * a 300 s IPFS gateway race, a JSZip policy decode, a full-table MV refresh).
 */
const LOCK_DURATION_BY_QUEUE: Record<string, number> = {
    [QUEUE_NAMES.TOPIC_SYNC]: envInt('TOPIC_SYNC_LOCK_DURATION', 180_000),
    [QUEUE_NAMES.TOPIC_SYNC_PRIORITY]: envInt('TOPIC_SYNC_LOCK_DURATION', 180_000),
    [QUEUE_NAMES.MESSAGE_PARSE]: envInt('MESSAGE_PARSE_LOCK_DURATION', 60_000),
    // The gateway race itself runs up to IPFS_FETCH_TIMEOUT (default 180 s,
    // 300 s in this deployment) — the lock has to outlast it.
    [QUEUE_NAMES.IPFS_FETCH]: envInt('IPFS_FETCH_LOCK_DURATION', envInt('IPFS_FETCH_TIMEOUT', 180_000) + 30_000),
    [QUEUE_NAMES.POLICY_DECODE]: envInt('POLICY_DECODE_LOCK_DURATION', 600_000),
    [QUEUE_NAMES.TOKEN_SYNC]: envInt('TOKEN_SYNC_LOCK_DURATION', 180_000),
    [QUEUE_NAMES.RETIRE_SYNC]: envInt('RETIRE_SYNC_LOCK_DURATION', 180_000),
    [QUEUE_NAMES.MV_REFRESH]: envInt('MV_REFRESH_LOCK_DURATION', 600_000),
    [QUEUE_NAMES.BUSINESS_VIEW_BUILD]: envInt('BUSINESS_VIEW_BUILD_LOCK_DURATION', 300_000),
    [QUEUE_NAMES.PROJECT_REPARSE]: envInt('PROJECT_REPARSE_LOCK_DURATION', 120_000),
    // A handful of indexed lookups plus one small UPDATE — nothing here is slow.
    [QUEUE_NAMES.POLICY_STATUS]: envInt('POLICY_STATUS_LOCK_DURATION', 60_000),
};

export type TopicPollMode = 'chain' | 'dispatcher';

/**
 * How a topic's next poll gets scheduled.
 *
 * `chain` (default) — each topic-sync job enqueues its own successor. Simple and
 * battle-tested, but it parks one delayed BullMQ job per known topic forever, so
 * Redis load scales with topic count rather than with activity.
 *
 * `dispatcher` — topic_cache.nextPollAt is the schedule and a single leader-side
 * dispatcher hands out only the topics that are due. The queue then holds
 * O(due topics) instead of O(all topics).
 *
 * Both modes maintain nextPollAt, so switching needs no backfill and flipping
 * back is safe: the chains simply resume from the persisted watermark.
 */
export function getTopicPollMode(): TopicPollMode {
    return process.env.TOPIC_POLL_MODE === 'dispatcher' ? 'dispatcher' : 'chain';
}

/**
 * Per-queue request budget against the Hedera mirror node.
 *
 * Concurrency alone is the wrong lever here: raising it to drain a backlog also
 * multiplies the request rate, and the mirror node answers with HTTP 429 — which
 * fails the job outright. These queues are the ones that call it, so they get an
 * explicit ceiling on requests per second, independent of how many workers are
 * running the jobs.
 *
 * BullMQ applies a limiter PER WORKER PROCESS, so the fleet's real rate is this
 * times the number of workers draining that queue. Size it accordingly when
 * scaling out.
 */
const MIRROR_NODE_RATE_LIMITED: Record<string, number> = {
    [QUEUE_NAMES.TOPIC_SYNC]: envInt('MIRROR_NODE_RATE_TOPIC', 25),
    [QUEUE_NAMES.TOPIC_SYNC_PRIORITY]: envInt('MIRROR_NODE_RATE_TOPIC_PRIORITY', 10),
    [QUEUE_NAMES.TOKEN_SYNC]: envInt('MIRROR_NODE_RATE_TOKEN', 10),
    [QUEUE_NAMES.RETIRE_SYNC]: envInt('MIRROR_NODE_RATE_RETIRE', 5),
};

export interface WorkerRuntimeOptions {
    concurrency: number;
    lockDuration: number;
    stalledInterval: number;
    maxStalledCount: number;
    limiter?: { max: number; duration: number };
}

/**
 * Worker options for a @Processor decorator. Nothing else applies concurrency,
 * so a bare `@Processor(name)` runs at BullMQ's default of 1 regardless of what
 * getQueueConfigs() declares.
 */
export function getWorkerOptions(queueName: string): WorkerRuntimeOptions {
    const config = getQueueConfigs().find(q => q.name === queueName);
    // POLICY_DECODE carried its own documented stall tuning before these options
    // were centralised — keep honouring those env vars for that queue.
    const isPolicyDecode = queueName === QUEUE_NAMES.POLICY_DECODE;
    const ratePerSecond = MIRROR_NODE_RATE_LIMITED[queueName];
    return {
        ...(ratePerSecond > 0
            ? { limiter: { max: ratePerSecond, duration: 1000 } }
            : {}),
        concurrency: config?.concurrency ?? 1,
        lockDuration: LOCK_DURATION_BY_QUEUE[queueName] ?? 120_000,
        stalledInterval: isPolicyDecode
            ? envInt('POLICY_DECODE_STALLED_INTERVAL', envInt('WORKER_STALLED_INTERVAL', 60_000))
            : envInt('WORKER_STALLED_INTERVAL', 60_000),
        maxStalledCount: isPolicyDecode
            ? envInt('POLICY_DECODE_MAX_STALLED_COUNT', envInt('WORKER_MAX_STALLED_COUNT', 2))
            : envInt('WORKER_MAX_STALLED_COUNT', 2),
    };
}

/**
 * Returns only the queue names that this worker instance should process.
 * Controlled by WORKER_QUEUES env var (comma-separated base names).
 * If not set, processes all queues.
 * Supports glob-like patterns: "mirror-node-*" matches all mirror-node queues.
 */
export function getActiveQueues(): string[] {
    const envQueues = process.env.WORKER_QUEUES;
    const allQueues = Object.values(QUEUE_NAMES);

    if (!envQueues) return allQueues;

    const patterns = envQueues.split(',').map(q => q.trim());
    return allQueues.filter(queueName =>
        patterns.some(pattern => {
            // Strip the network suffix for pattern matching
            const network = getWorkerNetwork();
            const baseName = queueName.endsWith(`-${network}`)
                ? queueName.slice(0, -network.length - 1)
                : queueName;

            if (pattern.endsWith('*')) {
                return baseName.startsWith(pattern.slice(0, -1));
            }
            return baseName === pattern;
        }),
    );
}
