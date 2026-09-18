#!/usr/bin/env npx tsx
/**
 * Operational tooling for the BullMQ/Redict layer.
 *
 * Usage:
 *   npx tsx scripts/queue-maintenance.ts report
 *   npx tsx scripts/queue-maintenance.ts trim-events [maxLen]
 *   npx tsx scripts/queue-maintenance.ts clean [completedAgeHours] [failedAgeHours]
 *
 * `report` is read-only and safe at any time — run it before and after each
 * rollout phase to see whether the change landed.
 *
 * `trim-events` and `clean` only remove observability/history data (event
 * streams, finished job hashes). They never touch waiting/delayed/active jobs,
 * so no pending work is lost.
 *
 * Connection comes from the same REDICT_* env vars the app uses.
 */

import Redis from 'ioredis';
import { config as loadEnv } from 'dotenv';

loadEnv();

const BASE_QUEUE_NAMES = [
    'mirror-node-topics',
    'mirror-node-topics-priority',
    'mirror-node-messages',
    'ipfs-files',
    'policy-decode',
    'mirror-node-tokens',
    'mirror-node-retirements',
    'maintenance-refresh-mvs',
    'maintenance-build-business-views',
    'project-reparse',
];

/** Networks to inspect: every network this deployment is configured for. */
function networks(): string[] {
    const configured = process.env.HEDERA_NETWORKS || process.env.HEDERA_NET || 'testnet';
    return configured.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
}

function queueNames(): string[] {
    const names = networks().flatMap(net => BASE_QUEUE_NAMES.map(base => `${base}-${net}`));
    names.push('send-email'); // API mail queue carries no network suffix
    return names;
}

function client(): Redis {
    return new Redis({
        host: process.env.REDICT_HOST || 'localhost',
        port: parseInt(process.env.REDICT_PORT || '6379', 10),
        password: process.env.REDICT_PASSWORD || undefined,
        db: parseInt(process.env.REDICT_DB || '0', 10),
        maxRetriesPerRequest: null,
    });
}

function parseInfo(info: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of info.split('\n')) {
        const idx = line.indexOf(':');
        if (line.startsWith('#') || idx === -1) continue;
        out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return out;
}

function mb(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface QueueCounts {
    name: string;
    wait: number;
    active: number;
    delayed: number;
    prioritized: number;
    completed: number;
    failed: number;
    events: number;
}

async function countQueue(redis: Redis, name: string): Promise<QueueCounts> {
    const k = (suffix: string) => `bull:${name}:${suffix}`;
    const [wait, active, delayed, prioritized, completed, failed, events] = await Promise.all([
        redis.llen(k('wait')),
        redis.llen(k('active')),
        redis.zcard(k('delayed')),
        redis.zcard(k('prioritized')),
        redis.zcard(k('completed')),
        redis.zcard(k('failed')),
        redis.xlen(k('events')),
    ]);
    return { name, wait, active, delayed, prioritized, completed, failed, events };
}

async function report(redis: Redis): Promise<void> {
    const memory = parseInfo(await redis.info('memory'));
    const clients = parseInfo(await redis.info('clients'));
    const keyspace = parseInfo(await redis.info('keyspace'));

    const used = parseInt(memory.used_memory, 10);
    const max = parseInt(memory.maxmemory, 10);
    const pct = max > 0 ? ((used / max) * 100).toFixed(1) : 'n/a';

    console.log('=== Redict ===');
    console.log(`  memory        ${mb(used)} / ${max > 0 ? mb(max) : 'unlimited'}  (${pct}%)`);
    console.log(`  policy        ${memory.maxmemory_policy}`);
    console.log(`  clients       ${clients.connected_clients} connected, ${clients.blocked_clients} blocked`);
    console.log(`  keyspace      ${keyspace.db0 ?? 'empty'}`);

    console.log('\n=== Queues ===');
    const header = 'queue'.padEnd(42) +
        ['wait', 'active', 'delayed', 'prio', 'done', 'failed', 'events']
            .map(h => h.padStart(9)).join('');
    console.log(header);
    console.log('-'.repeat(header.length));

    let totalPending = 0;
    let totalEvents = 0;
    for (const name of queueNames()) {
        const c = await countQueue(redis, name);
        // A queue with nothing in it at all is noise in the report.
        if (!c.wait && !c.active && !c.delayed && !c.prioritized &&
            !c.completed && !c.failed && !c.events) continue;

        totalPending += c.wait + c.delayed + c.prioritized;
        totalEvents += c.events;
        console.log(
            c.name.padEnd(42) +
            [c.wait, c.active, c.delayed, c.prioritized, c.completed, c.failed, c.events]
                .map(n => String(n).padStart(9)).join(''),
        );
    }

    console.log('-'.repeat(header.length));
    console.log(`  pending work (wait+delayed+prioritized): ${totalPending.toLocaleString()}`);
    console.log(`  event stream entries:                    ${totalEvents.toLocaleString()}`);
    console.log(
        '\nNote: "prio" jobs are invisible to Queue.getWaitingCount() — a large\n' +
        'prioritized backlog with wait=0 is real work the autoscaler cannot see.',
    );
}

async function trimEvents(redis: Redis, maxLen: number): Promise<void> {
    console.log(`Trimming event streams to ~${maxLen} entries...\n`);
    let reclaimed = 0;
    for (const name of queueNames()) {
        const key = `bull:${name}:events`;
        const before = await redis.xlen(key);
        if (before <= maxLen) continue;
        await redis.xtrim(key, 'MAXLEN', '~', maxLen);
        const after = await redis.xlen(key);
        reclaimed += before - after;
        console.log(`  ${name.padEnd(42)} ${before} → ${after}`);
    }
    console.log(`\nRemoved ${reclaimed.toLocaleString()} stream entries.`);
}

async function clean(redis: Redis, completedAgeH: number, failedAgeH: number): Promise<void> {
    // Job hashes for finished jobs are removed by deleting them from the
    // completed/failed ZSETs and unlinking the hash. BullMQ's Queue.clean()
    // does this correctly, so use the library rather than hand-rolling it.
    const { Queue } = await import('bullmq');
    const connection = {
        host: process.env.REDICT_HOST || 'localhost',
        port: parseInt(process.env.REDICT_PORT || '6379', 10),
        password: process.env.REDICT_PASSWORD || undefined,
        db: parseInt(process.env.REDICT_DB || '0', 10),
        maxRetriesPerRequest: null,
    };

    console.log(
        `Cleaning completed older than ${completedAgeH}h and failed older than ${failedAgeH}h...\n`,
    );

    for (const name of queueNames()) {
        const queue = new Queue(name, { connection });
        try {
            let totalCompleted = 0;
            let totalFailed = 0;

            // clean() returns at most `limit` ids per call, so loop until drained.
            for (;;) {
                const ids = await queue.clean(completedAgeH * 3600_000, 5000, 'completed');
                totalCompleted += ids.length;
                if (ids.length < 5000) break;
            }
            for (;;) {
                const ids = await queue.clean(failedAgeH * 3600_000, 5000, 'failed');
                totalFailed += ids.length;
                if (ids.length < 5000) break;
            }

            if (totalCompleted || totalFailed) {
                console.log(
                    `  ${name.padEnd(42)} removed ${totalCompleted} completed, ${totalFailed} failed`,
                );
            }
        } catch (err) {
            console.warn(`  ${name.padEnd(42)} error: ${(err as Error).message}`);
        } finally {
            await queue.close();
        }
    }
}

async function main(): Promise<void> {
    const [command, ...args] = process.argv.slice(2);
    const redis = client();

    try {
        switch (command) {
            case 'report':
                await report(redis);
                break;
            case 'trim-events':
                await trimEvents(redis, parseInt(args[0] || '1000', 10));
                break;
            case 'clean':
                await clean(
                    redis,
                    parseInt(args[0] || '24', 10),
                    parseInt(args[1] || '168', 10),
                );
                break;
            default:
                console.error(
                    'Usage:\n' +
                    '  npx tsx scripts/queue-maintenance.ts report\n' +
                    '  npx tsx scripts/queue-maintenance.ts trim-events [maxLen=1000]\n' +
                    '  npx tsx scripts/queue-maintenance.ts clean [completedAgeH=24] [failedAgeH=168]',
                );
                process.exitCode = 1;
        }
    } finally {
        redis.disconnect();
    }
}

void main();
