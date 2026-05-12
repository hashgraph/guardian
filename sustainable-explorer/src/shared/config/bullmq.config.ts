/**
 * Base queue names (without network prefix).
 * Actual queue names at runtime are `{baseName}-{network}` so that each
 * Hedera network gets its own queue set and workers never pick up jobs
 * belonging to another network.
 */
export const BASE_QUEUE_NAMES = {
    TOPIC_SYNC: 'mirror-node-topics',
    MESSAGE_PARSE: 'mirror-node-messages',
    IPFS_FETCH: 'ipfs-files',
    POLICY_DECODE: 'policy-decode',
    TOKEN_SYNC: 'mirror-node-tokens',
    MV_REFRESH: 'maintenance-refresh-mvs',
    BUSINESS_VIEW_BUILD: 'maintenance-build-business-views',
    PROJECT_REPARSE: 'project-reparse',
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
    MESSAGE_PARSE: qname(BASE_QUEUE_NAMES.MESSAGE_PARSE),
    IPFS_FETCH: qname(BASE_QUEUE_NAMES.IPFS_FETCH),
    POLICY_DECODE: qname(BASE_QUEUE_NAMES.POLICY_DECODE),
    TOKEN_SYNC: qname(BASE_QUEUE_NAMES.TOKEN_SYNC),
    MV_REFRESH: qname(BASE_QUEUE_NAMES.MV_REFRESH),
    BUSINESS_VIEW_BUILD: qname(BASE_QUEUE_NAMES.BUSINESS_VIEW_BUILD),
    PROJECT_REPARSE: qname(BASE_QUEUE_NAMES.PROJECT_REPARSE),
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export interface QueueDefinition {
    name: QueueName;
    defaultJobOptions: {
        attempts: number;
        backoff: {
            type: 'exponential' | 'fixed';
            delay: number;
        };
        timeout: number;
        removeOnComplete: boolean | number;
        removeOnFail: boolean | number;
    };
    concurrency: number;
}

function envInt(name: string, defaultValue: number): number {
    return parseInt(process.env[name] || String(defaultValue), 10);
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
                timeout: 120000,
                removeOnComplete: envInt('TOPIC_SYNC_REMOVE_ON_COMPLETE', 1000),
                removeOnFail: envInt('TOPIC_SYNC_REMOVE_ON_FAIL', 5000),
            },
            concurrency: envInt('WORKER_TOPIC_CONCURRENCY', 5),
        },
        {
            name: QUEUE_NAMES.MESSAGE_PARSE,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                timeout: 60000,
                removeOnComplete: envInt('MESSAGE_PARSE_REMOVE_ON_COMPLETE', 1000),
                removeOnFail: envInt('MESSAGE_PARSE_REMOVE_ON_FAIL', 5000),
            },
            concurrency: envInt('WORKER_MESSAGE_CONCURRENCY', 10),
        },
        {
            name: QUEUE_NAMES.IPFS_FETCH,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 5000 },
                timeout: envInt('IPFS_FETCH_TIMEOUT', 180000),
                removeOnComplete: envInt('IPFS_FETCH_REMOVE_ON_COMPLETE', 500),
                removeOnFail: envInt('IPFS_FETCH_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_IPFS_CONCURRENCY', 3),
        },
        {
            name: QUEUE_NAMES.POLICY_DECODE,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 5000 },
                timeout: envInt(
                    'POLICY_DECODE_TIMEOUT',
                    envInt('POLICY_SCHEMA_IMPORT_TIMEOUT', 300000),
                ),
                removeOnComplete: envInt('POLICY_DECODE_REMOVE_ON_COMPLETE', 500),
                removeOnFail: envInt('POLICY_DECODE_REMOVE_ON_FAIL', 2000),
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
                timeout: 90000,
                removeOnComplete: envInt('TOKEN_SYNC_REMOVE_ON_COMPLETE', 500),
                removeOnFail: envInt('TOKEN_SYNC_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_TOKEN_CONCURRENCY', 2),
        },
        {
            name: QUEUE_NAMES.MV_REFRESH,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'fixed', delay: 5000 },
                timeout: 300000,
                removeOnComplete: envInt('MV_REFRESH_REMOVE_ON_COMPLETE', 100),
                removeOnFail: envInt('MV_REFRESH_REMOVE_ON_FAIL', 500),
            },
            concurrency: 1,
        },
        {
            name: QUEUE_NAMES.BUSINESS_VIEW_BUILD,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'fixed', delay: 1000 },
                timeout: 60000,
                removeOnComplete: envInt('BUSINESS_VIEW_BUILD_REMOVE_ON_COMPLETE', 100),
                removeOnFail: envInt('BUSINESS_VIEW_BUILD_REMOVE_ON_FAIL', 500),
            },
            concurrency: 5,
        },
        {
            name: QUEUE_NAMES.PROJECT_REPARSE,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                timeout: 60000,
                removeOnComplete: envInt('PROJECT_REPARSE_REMOVE_ON_COMPLETE', 500),
                removeOnFail: envInt('PROJECT_REPARSE_REMOVE_ON_FAIL', 2000),
            },
            concurrency: envInt('WORKER_PROJECT_REPARSE_CONCURRENCY', 5),
        },
    ];
}

/**
 * Returns queue registration objects for BullModule.registerQueue().
 */
export function getQueueRegistrations(): Array<{ name: string; defaultJobOptions?: object }> {
    return getQueueConfigs().map((q) => ({
        name: q.name,
        defaultJobOptions: q.defaultJobOptions,
    }));
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
