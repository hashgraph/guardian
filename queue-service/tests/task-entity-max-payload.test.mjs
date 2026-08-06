import assert from 'node:assert/strict';
import { TaskEntity } from '../dist/entity/task.js';

// The ceiling that stops an undeliverable task from ever entering the queue.
// TASK_MAX_PAYLOAD is read per call, so it is scoped to this suite and restored afterwards -
// mocha shares one process with the other spec files.

const LIMIT = 64 * 1024;

const stubFiles = (t) => {
    const calls = { create: [] };
    t._createFile = async (json, name) => {
        calls.create.push({ json, name });
        return 'grid-file-id';
    };
    return calls;
};

const oversized = () => ({ blob: 'x'.repeat(128 * 1024) });
const acceptable = () => ({ blob: 'x'.repeat(1024) });

describe('TaskEntity TASK_MAX_PAYLOAD', () => {
    let previous;

    beforeEach(() => {
        previous = process.env.TASK_MAX_PAYLOAD;
        process.env.TASK_MAX_PAYLOAD = String(LIMIT);
    });

    afterEach(() => {
        if (previous === undefined) {
            delete process.env.TASK_MAX_PAYLOAD;
        } else {
            process.env.TASK_MAX_PAYLOAD = previous;
        }
    });

    it('rejects an oversized payload on create', async () => {
        const t = new TaskEntity();
        stubFiles(t);
        t.type = 'add-file';
        t.data = oversized();

        await assert.rejects(() => t.offloadDataOnCreate(), /Task payload is too large/);
    });

    it('reports the actual size, the limit and the task type', async () => {
        const t = new TaskEntity();
        stubFiles(t);
        t.type = 'add-file';
        t.data = oversized();

        await assert.rejects(() => t.offloadDataOnCreate(), (error) => {
            assert.match(error.message, /MB/);
            assert.match(error.message, /limit/);
            assert.match(error.message, /add-file/);
            return true;
        });
    });

    it('does not leave an orphaned GridFS file behind when it rejects', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        t.data = oversized();

        await assert.rejects(() => t.offloadDataOnCreate());
        assert.equal(calls.create.length, 0);
    });

    it('accepts payloads under the ceiling', async () => {
        const t = new TaskEntity();
        stubFiles(t);
        t.data = acceptable();

        await t.offloadDataOnCreate();
        assert.ok(t.dataSize > 0);
    });

    it('does not enforce the ceiling on update, so a queued task stays saveable', async () => {
        const t = new TaskEntity();
        stubFiles(t);
        t.data = oversized();

        // No throw: status updates on an already-queued task must never be blocked by the ceiling.
        await t.offloadDataOnUpdate();
    });

    it('defaults to a limit far above the GridFS offload threshold', async () => {
        delete process.env.TASK_MAX_PAYLOAD;
        const t = new TaskEntity();
        stubFiles(t);
        // 5MB+ is offloaded to GridFS but must still be accepted - rejecting here would break
        // every legitimate large IPFS upload.
        t.data = { blob: 'x'.repeat(6 * 1024 * 1024) };

        await t.offloadDataOnCreate();
        assert.ok(t.dataFileId);
    });
});
