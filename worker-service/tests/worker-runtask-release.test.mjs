import assert from 'node:assert/strict';
import { NatsService } from '@guardian/common';
import { WorkerEvents } from '@guardian/interfaces';
import { HederaSDKHelper } from '../dist/api/helpers/hedera-sdk-helper.js';

/*
 * runTask marks the worker busy and used to clear that flag only with the last
 * statement of the happy path. A throw anywhere in between left isInUse stuck at
 * true for the lifetime of the process: GET_FREE_WORKERS stops replying,
 * WORKER_READY is never re-published, and the pod keeps passing its liveness
 * probe while accepting no further work.
 *
 * Both call sites invoke runTask without await and without catch, so the
 * rejection has nowhere to surface either.
 */

process.env.MIN_PRIORITY = process.env.MIN_PRIORITY || '0';
process.env.MAX_PRIORITY = process.env.MAX_PRIORITY || '100';
process.env.TASK_TIMEOUT = process.env.TASK_TIMEOUT || '600';
process.env.ANALYTICS_SERVICE = process.env.ANALYTICS_SERVICE || 'http://analytics.local';

const { Worker } = await import('../dist/api/worker.js');

const fakeLogger = { error: async () => {}, info: async () => {}, warn: async () => {}, debug: async () => {} };

function makeHarness() {
    const restorers = [];
    const captured = { subscribe: new Map(), getMessages: new Map(), publishes: [] };

    const origInit = NatsService.prototype.init;
    NatsService.prototype.init = async function () {};
    restorers.push(() => { NatsService.prototype.init = origInit; });

    const origTxCb = HederaSDKHelper.setTransactionResponseCallback;
    HederaSDKHelper.setTransactionResponseCallback = () => {};
    restorers.push(() => { HederaSDKHelper.setTransactionResponseCallback = origTxCb; });

    const worker = new Worker('w3c-key', 'w3c-proof', 'filebase-key', 'worker-release', fakeLogger);
    worker.connection = {
        subscribe() { return { async *[Symbol.asyncIterator]() {}, unsubscribe() {} }; },
        publish() {},
    };
    worker.subscribe = (event, handler) => { captured.subscribe.set(event, handler); return { unsubscribe() {} }; };
    worker.getMessages = (event, handler) => { captured.getMessages.set(event, handler); return { unsubscribe() {} }; };
    worker.publish = async (subject, data) => {
        captured.publishes.push({ subject, data });
        if (captured.publishThrowsOn && subject === captured.publishThrowsOn) {
            throw new Error('publish rejected: payload too large');
        }
    };

    return { worker, captured, restore() { while (restorers.length) { restorers.pop()(); } } };
}

// Drive one task through the real SEND_TASK_TO_WORKER handler and let the
// unawaited runTask settle.
async function dispatch(h, task = { id: 't-1', type: 'GET_FILE', data: {} }) {
    const sendKey = [...h.captured.getMessages.keys()]
        .find(k => k.endsWith(WorkerEvents.SEND_TASK_TO_WORKER));
    await h.captured.getMessages.get(sendKey)(task);
    for (let i = 0; i < 20; i++) { await new Promise(r => setImmediate(r)); }
}

describe('@unit Worker runTask releases the worker on every exit path', () => {
    let h;
    afterEach(() => { if (h) { h.restore(); h = null; } });

    it('releases isInUse after a normal task', async () => {
        h = makeHarness();
        await h.worker.init();
        h.worker.processTaskWithTimeout = async () => ({ id: 't-1', data: 'ok' });
        await dispatch(h);
        assert.equal(h.worker.isInUse, false, 'worker must be free after a normal task');
    });

    it('releases isInUse when the task itself throws', async () => {
        h = makeHarness();
        await h.worker.init();
        h.worker.processTaskWithTimeout = async () => { throw new Error('task blew up'); };
        await dispatch(h);
        assert.equal(h.worker.isInUse, false, 'a throwing task must not strand the worker');
    });

    it('releases isInUse when publishing the result fails', async () => {
        // The realistic trigger: an oversized TASK_COMPLETE rejected at publish time.
        h = makeHarness();
        await h.worker.init();
        h.captured.publishThrowsOn = WorkerEvents.TASK_COMPLETE;
        h.worker.processTaskWithTimeout = async () => ({ id: 't-1', data: 'x'.repeat(64) });
        await dispatch(h);
        assert.equal(h.worker.isInUse, false, 'a failed result publish must not strand the worker');
    });

    it('re-publishes WORKER_READY even when the task threw', async () => {
        // Releasing the flag is not enough: without re-announcing, the worker still
        // sits out of the pool.
        h = makeHarness();
        await h.worker.init();
        h.worker.processTaskWithTimeout = async () => { throw new Error('task blew up'); };
        await dispatch(h);
        const ready = h.captured.publishes.filter(p => p.subject === WorkerEvents.WORKER_READY);
        assert.equal(ready.length, 1, 'WORKER_READY must be re-published after a failure');
    });

    it('still answers GET_FREE_WORKERS after a failed task', async () => {
        h = makeHarness();
        await h.worker.init();
        h.worker.processTaskWithTimeout = async () => { throw new Error('task blew up'); };
        await dispatch(h);

        const before = h.captured.publishes.length;
        await h.captured.subscribe.get(WorkerEvents.GET_FREE_WORKERS)({ replySubject: 'reply.free' });
        const replied = h.captured.publishes.slice(before).some(p => p.subject === 'reply.free');
        assert.equal(replied, true, 'a recovered worker must advertise itself as free again');
    });

    it('reports an error to the requester when the result cannot be delivered', async () => {
        h = makeHarness();
        await h.worker.init();
        h.captured.publishThrowsOn = WorkerEvents.TASK_COMPLETE;
        h.worker.processTaskWithTimeout = async () => ({ id: 't-1', data: 'too big' });
        await dispatch(h);

        // First TASK_COMPLETE threw; a second carries the failure so the caller
        // fails fast instead of waiting out its own timeout.
        const completes = h.captured.publishes.filter(p => p.subject === WorkerEvents.TASK_COMPLETE);
        assert.equal(completes.length, 2, 'the undeliverable result must be reported back');
        assert.match(String(completes[1].data?.error ?? ''), /could not be delivered/i);
    });
});
