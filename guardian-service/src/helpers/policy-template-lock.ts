import { DataBaseHelper } from '@guardian/common';
import { Db } from 'mongodb';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

/**
 * Advisory lock for schema-template operations on one policy.
 *
 * APPLY and UPDATE write the binding last, so it cannot guard the window being
 * raced: two overlapping runs both pass the "already applied" check, both do the
 * work, and last writer wins - orphaning the loser's snapshot and leaving its
 * schema copies as duplicates. Modelled on withMigrationLock.
 */

const LOCK_COLLECTION = '_policy_template_lock';

// A generous ceiling for a large apply; a crashed holder frees the policy after this.
const TTL_MS = 120_000;
// Renew well inside the lease while the work is still running.
const HEARTBEAT_MS = 30_000;

export class PolicyTemplateLockedError extends Error {
    constructor(policyId: string) {
        super(
            `Another schema template operation is already running for policy "${policyId}". ` +
            `Wait for it to finish and try again.`
        );
    }
}

/**
 * Run `fn` while holding the lock for `policyId`. Throws PolicyTemplateLockedError
 * immediately if another run holds it, and always releases - including on failure.
 */
export async function withPolicyTemplateLock<T>(
    policyId: string,
    fn: () => Promise<T>
): Promise<T> {
    /*
     * Optional *calls*, not just optional property access: `em?.getDriver()` still
     * throws when getDriver is absent, and a lock helper must never be the reason a
     * template operation fails. If there is no connection to coordinate through we
     * run unlocked - the pre-existing behaviour, not a regression.
     */
    let db: Db | undefined;
    try {
        db = (DataBaseHelper as any).orm?.em?.getDriver?.()?.getConnection?.()?.getDb?.();
    } catch {
        db = undefined;
    }
    if (!db) {
        return await fn();
    }

    const col = db.collection(LOCK_COLLECTION);
    const token = `${hostname()}-${process.pid}-${randomUUID()}`;

    const acquired = await col.findOneAndUpdate(
        {
            _id: policyId as any,
            $or: [{ holder: null }, { expiresAt: { $lt: new Date() } }],
        },
        {
            $set: {
                holder: token,
                acquiredAt: new Date(),
                expiresAt: new Date(Date.now() + TTL_MS),
            },
        },
        { upsert: true, returnDocument: 'after' }
    ).catch((error: any) => {
        // 11000: another run inserted the document first, i.e. it holds the lock.
        if (error?.code === 11000) {
            return null;
        }
        throw error;
    });

    if (!acquired) {
        throw new PolicyTemplateLockedError(policyId);
    }

    // Keep the lease fresh for a long-running apply. unref() so a pending renewal
    // can never hold the process open by itself.
    const heartbeat = setInterval(() => {
        col.updateOne(
            { _id: policyId as any, holder: token },
            { $set: { expiresAt: new Date(Date.now() + TTL_MS) } }
        ).catch(() => undefined);
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

    try {
        return await fn();
    } finally {
        clearInterval(heartbeat);
        // Only ever release our own hold: if the lease expired and someone else took
        // over, the holder check stops us from freeing their lock.
        await col.updateOne(
            { _id: policyId as any, holder: token },
            { $set: { holder: null, expiresAt: new Date(0) } }
        ).catch(() => undefined);
    }
}
