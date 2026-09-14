import assert from 'node:assert/strict';
import esmock from 'esmock';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lockPath = path.resolve(__dirname, '../../dist/helpers/policy-template-lock.js');

/**
 * A Mongo collection stand-in recording what the lock does with it.
 *
 * `findOneAndUpdate` answers according to whether the document is currently held,
 * which is what the compare-and-set filter means in practice.
 */
function makeDb() {
    const held = new Map();
    const calls = { findOneAndUpdate: [], updateOne: [] };
    const collection = {
        async findOneAndUpdate(filter, update, options) {
            calls.findOneAndUpdate.push({ filter, update, options });
            const id = filter._id;
            const current = held.get(id);
            const free = !current || (current.expiresAt && current.expiresAt < new Date());
            if (!free) {
                // the real driver raises E11000 here on the upsert
                const error = new Error('E11000 duplicate key');
                error.code = 11000;
                throw error;
            }
            const doc = { _id: id, ...update.$set };
            held.set(id, doc);
            return doc;
        },
        async updateOne(filter, update) {
            calls.updateOne.push({ filter, update });
            const current = held.get(filter._id);
            if (current && current.holder === filter.holder) {
                Object.assign(current, update.$set);
            }
            return { modifiedCount: 1 };
        },
    };
    return {
        calls,
        held,
        db: { collection: () => collection },
    };
}

const load = (db) => esmock(lockPath, {
    '@guardian/common': {
        DataBaseHelper: {
            orm: { em: { getDriver: () => ({ getConnection: () => ({ getDb: () => db }) }) } },
        },
    },
});

describe('withPolicyTemplateLock', function () {
    // the first esmock load of the dist module is well over mocha's 2s default
    this.timeout(30000);

    it('runs the operation and releases the lock afterwards', async () => {
        const { db, calls, held } = makeDb();
        const { withPolicyTemplateLock } = await load(db);

        const result = await withPolicyTemplateLock('policy-1', async () => 'done');

        assert.equal(result, 'done');
        assert.equal(calls.findOneAndUpdate.length, 1);
        assert.equal(held.get('policy-1').holder, null, 'the lock must not stay held');
    });

    it('refuses a second operation on the same policy instead of racing it', async () => {
        const { db } = makeDb();
        const { withPolicyTemplateLock, PolicyTemplateLockedError } = await load(db);

        let release;
        const first = withPolicyTemplateLock('policy-1', () => new Promise((resolve) => {
            release = resolve;
        }));
        // first is in flight and holds the lock
        await assert.rejects(
            () => withPolicyTemplateLock('policy-1', async () => 'second'),
            (error) => {
                assert.ok(error instanceof PolicyTemplateLockedError);
                assert.match(error.message, /policy-1/);
                return true;
            },
            'the binding is written last, so it cannot guard this window'
        );

        release('first');
        assert.equal(await first, 'first');
    });

    it('does not block a different policy', async () => {
        const { db } = makeDb();
        const { withPolicyTemplateLock } = await load(db);

        let release;
        const first = withPolicyTemplateLock('policy-1', () => new Promise((r) => { release = r; }));
        const second = await withPolicyTemplateLock('policy-2', async () => 'ok');

        assert.equal(second, 'ok');
        release('first');
        await first;
    });

    it('releases the lock when the operation throws', async () => {
        const { db, held } = makeDb();
        const { withPolicyTemplateLock } = await load(db);

        await assert.rejects(
            () => withPolicyTemplateLock('policy-1', async () => { throw new Error('apply failed'); }),
            /apply failed/
        );

        assert.equal(held.get('policy-1').holder, null);
        // and the policy is usable again
        assert.equal(await withPolicyTemplateLock('policy-1', async () => 'retry'), 'retry');
    });

    it('takes over a lease whose holder died', async () => {
        const { db, held } = makeDb();
        const { withPolicyTemplateLock } = await load(db);

        held.set('policy-1', {
            _id: 'policy-1',
            holder: 'a-process-that-is-gone',
            expiresAt: new Date(Date.now() - 1000),
        });

        assert.equal(
            await withPolicyTemplateLock('policy-1', async () => 'taken over'),
            'taken over',
            'a crashed holder must not wedge the policy forever'
        );
    });

    it('runs unlocked rather than failing when there is no connection', async () => {
        const { withPolicyTemplateLock } = await esmock(lockPath, {
            '@guardian/common': { DataBaseHelper: { orm: undefined } },
        });

        assert.equal(await withPolicyTemplateLock('policy-1', async () => 'ran'), 'ran');
    });
});
