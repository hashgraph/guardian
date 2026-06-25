import assert from 'node:assert/strict';
import { Workers } from '@guardian/common';

// Build a Workers instance without running the NatsService constructor (and without
// the @Singleton shared instance): we only need addTask + its dependencies.
function makeWorkers(sendMessageStub) {
    const w = Object.create(Workers.prototype);
    w.tasksCallbacks = new Map();
    w.sendMessage = sendMessageStub;
    return w;
}

function options(overrides = {}) {
    return {
        task: { type: 'CREATE_ACCOUNT', data: {} },
        priority: 10,
        attempts: 0,
        isRetryableTask: true,
        registerCallback: false,
        interception: null,
        dryRun: null,
        mockId: null,
        userId: null,
        ...overrides,
    };
}

describe('Workers.addTask enqueue handling', () => {
    it('rejects on an explicit ok:false and does not retry', async () => {
        let calls = 0;
        const reason = 'Document is larger than the maximum size 16777216';
        const w = makeWorkers(async () => {
            calls++;
            return { ok: false, reason };
        });

        await assert.rejects(w.addTask(options()), (err) => {
            assert.equal(err.message, reason);
            return true;
        });
        assert.equal(calls, 1);
    });

    it('uses the fallback message when ok:false has no reason', async () => {
        const w = makeWorkers(async () => ({ ok: false }));

        await assert.rejects(w.addTask(options()), {
            message: 'ADD_TASK_TO_QUEUE: task rejected by queue service',
        });
    });

    it('retries when there is no response, then succeeds', async () => {
        let calls = 0;
        const w = makeWorkers(async () => {
            calls++;
            return calls === 1 ? undefined : { ok: true };
        });

        const result = await w.addTask(options({ registerCallback: false }));
        assert.equal(result, null);
        assert.equal(calls, 2);
    });

    it('resolves on a successful enqueue', async () => {
        let calls = 0;
        const w = makeWorkers(async () => {
            calls++;
            return { ok: true };
        });

        const result = await w.addTask(options({ registerCallback: false }));
        assert.equal(result, null);
        assert.equal(calls, 1);
    });
});
