import { Db } from 'mongodb';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

/**
 * Distributed migration lock so only one replica of a service runs migrations at
 * a time. Prevents concurrent data-backfill migrations from inserting duplicate
 * rows before a unique index exists. The lock document lives in the service's own
 * database, so it scopes to replicas of a single service.
 */

const LOCK_COLLECTION = '_migration_lock';
const LOCK_ID = 'migrations';

// A holder that crashes without releasing frees the lock after at most TTL_MS.
const TTL_MS = 60_000;
const HEARTBEAT_MS = 20_000;
const POLL_MS = 2_000;
const MAX_WAIT_MS = 300_000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` while holding the migration lock, always releasing it afterwards.
 */
export async function withMigrationLock<T>(db: Db, fn: () => Promise<T>): Promise<T> {
    const col = db.collection(LOCK_COLLECTION);
    const token = `${hostname()}-${process.pid}-${randomUUID()}`;

    try {
        await col.updateOne(
            { _id: LOCK_ID as any },
            { $setOnInsert: { holder: null, expiresAt: new Date(0) } },
            { upsert: true }
        );
    } catch (error: any) {
        if (error?.code !== 11000) {
            throw error;
        }
    }

    const deadline = Date.now() + MAX_WAIT_MS;
    // Atomically take the lock only if it is free or its lease has expired.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const acquired = await col.findOneAndUpdate(
            {
                _id: LOCK_ID as any,
                $or: [{ holder: null }, { expiresAt: { $lt: new Date() } }],
            },
            {
                $set: {
                    holder: token,
                    acquiredAt: new Date(),
                    expiresAt: new Date(Date.now() + TTL_MS),
                },
            },
            { returnDocument: 'after' }
        );
        if (acquired) {
            break;
        }
        if (Date.now() > deadline) {
            throw new Error(`[migration-lock] timed out after ${MAX_WAIT_MS}ms waiting for the migration lock`);
        }
        await sleep(POLL_MS);
    }

    // Keep the lease fresh while migrations run; unref so it never keeps the
    // process alive on its own.
    const heartbeat = setInterval(() => {
        col.updateOne(
            { _id: LOCK_ID as any, holder: token },
            { $set: { expiresAt: new Date(Date.now() + TTL_MS) } }
        ).catch(() => { /* next heartbeat retries */ });
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

    try {
        return await fn();
    } finally {
        clearInterval(heartbeat);
        await col.updateOne(
            { _id: LOCK_ID as any, holder: token },
            { $set: { holder: null, expiresAt: new Date(0) } }
        ).catch(() => { /* lease expires on its own */ });
    }
}
