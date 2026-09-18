import { assert } from 'chai';
import { IPFSTaskManager } from '../../dist/helpers/ipfs-task-manager.js';

describe('@unit IPFSTaskManager', () => {
    let counter = 0;
    const uniqueId = () => `task-${Date.now()}-${++counter}`;

    it('Resolve fires the resolve callback with the given value', async () => {
        const id = uniqueId();
        const promise = new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, resolve, reject);
        });
        IPFSTaskManager.Resolve(id, 'cid-abc');
        const result = await promise;
        assert.equal(result, 'cid-abc');
    });

    it('Reject fires the reject callback with the given reason', async () => {
        const id = uniqueId();
        const promise = new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, resolve, reject);
        });
        IPFSTaskManager.Reject(id, new Error('ipfs-down'));
        try {
            await promise;
            assert.fail('expected promise to reject');
        } catch (e) {
            assert.equal(e.message, 'ipfs-down');
        }
    });

    it('Resolving an unknown taskId is a no-op (does not throw)', () => {
        assert.doesNotThrow(() => IPFSTaskManager.Resolve('does-not-exist', 'value'));
    });

    it('Rejecting an unknown taskId is a no-op (does not throw)', () => {
        assert.doesNotThrow(() => IPFSTaskManager.Reject('does-not-exist', 'reason'));
    });

    it('Resolving twice fires only the first time (entry deleted after first)', async () => {
        const id = uniqueId();
        let resolveCalls = 0;
        const promise = new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, (v) => { resolveCalls++; resolve(v); }, reject);
        });
        IPFSTaskManager.Resolve(id, 'first');
        await promise;
        IPFSTaskManager.Resolve(id, 'second'); // should be a no-op
        assert.equal(resolveCalls, 1);
    });

    it('Reject after Resolve is a no-op (entry deleted after Resolve)', async () => {
        const id = uniqueId();
        let rejected = false;
        const promise = new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, resolve, () => { rejected = true; });
        });
        IPFSTaskManager.Resolve(id, 'ok');
        await promise;
        IPFSTaskManager.Reject(id, 'late');
        assert.equal(rejected, false);
    });

    it('AddTask with the same id overwrites the previous entry (current behaviour)', async () => {
        const id = uniqueId();
        let firstResolved = false;
        new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, () => { firstResolved = true; resolve(); }, reject);
        });
        const second = new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, resolve, reject); // overwrites
        });
        IPFSTaskManager.Resolve(id, 'value');
        await second;
        assert.equal(firstResolved, false, 'first registration should be orphaned by overwrite');
    });

    it('parallel tasks resolve independently', async () => {
        const ids = [uniqueId(), uniqueId(), uniqueId()];
        const promises = ids.map((id) => new Promise((resolve, reject) => {
            IPFSTaskManager.AddTask(id, resolve, reject);
        }));
        ids.forEach((id, i) => IPFSTaskManager.Resolve(id, `value-${i}`));
        const results = await Promise.all(promises);
        assert.deepEqual(results, ['value-0', 'value-1', 'value-2']);
    });
});
