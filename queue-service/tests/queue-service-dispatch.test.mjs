import assert from 'node:assert/strict';
import { DatabaseServer } from '@guardian/common';
import { QueueService } from '../dist/queue-service/queue-service.js';
import { QueueEvents } from '@guardian/interfaces';

// Regression coverage: two 81.78MB add-file tasks could enter the queue, never fit inline over
// NATS, and retry forever because a failed hand-off to a worker never advanced any counter - the
// task was therefore never given up on. These tests cover the counter (dispatchAttempt) and the
// timeout scaling that make a large-but-valid task distinguishable from an undeliverable one.

const service = new QueueService();

const MB = 1024 * 1024;

// Minimal stand-in for a claimed TaskEntity. releaseOrParkTask only reads/writes plain fields
// before it reaches the (uninitialised) ORM, so the state machine is observable without a DB.
const makeTask = (over = {}) => ({
    taskId: 't-1',
    type: 'add-file',
    data: { payload: 'x' },
    dataSize: 82 * MB,
    attempt: 0,
    attempts: 3,
    isRetryableTask: true,
    dispatchAttempt: 0,
    sent: true,
    done: false,
    isError: false,
    errorReason: undefined,
    processedTime: new Date(),
    ...over,
});

// The ORM is not initialised in unit tests, so save() throws. Everything the state machine
// decides happens before that call, which is exactly what we want to assert.
const runReleaseOrPark = async (task, reason) => {
    await assert.rejects(() => service.releaseOrParkTask(task, reason), /ORM is not initialized/);
    return task;
};

// releaseOrParkTask/resetDispatchAttempt now re-read the task by taskId instead of writing back
// the (possibly stale) snapshot the caller holds. Stub DatabaseServer.findOne/save and
// QueueService.publish so both the re-queue and dead-letter branches (including the publish,
// which the ORM-throws trick above can never reach) are exercised end to end.
const stubDb = ({ found } = {}) => {
    const calls = { findOneFilters: [], saved: [], published: [] };
    const originalFindOne = DatabaseServer.prototype.findOne;
    const originalSave = DatabaseServer.prototype.save;
    const originalPublish = service.publish;

    DatabaseServer.prototype.findOne = async function (entityClass, filters) {
        calls.findOneFilters.push(filters);
        return found ?? null;
    };
    DatabaseServer.prototype.save = async function (entityClass, item) {
        calls.saved.push(item);
        return item;
    };
    service.publish = async function (subject, data) {
        calls.published.push({ subject, data });
    };

    calls.restore = () => {
        DatabaseServer.prototype.findOne = originalFindOne;
        DatabaseServer.prototype.save = originalSave;
        service.publish = originalPublish;
    };
    return calls;
};

describe('QueueService.getSendTaskTimeout', () => {
    it('uses the flat timeout for payloads that fit inline in a NATS message', () => {
        assert.equal(
            service.getSendTaskTimeout({ dataSize: 512 * 1024 }),
            service.workerSendTaskTimeout
        );
    });

    it('scales the timeout with payload size once the payload goes out-of-band', () => {
        const timeout = service.getSendTaskTimeout({ dataSize: 82 * MB });
        assert.equal(
            timeout,
            service.workerSendTaskTimeout + 82 * service.workerSendTaskTimeoutPerMb
        );
        // The whole point: an 82MB task must not be declared failed after a flat few-second timeout.
        assert.ok(timeout > service.workerSendTaskTimeout);
    });

    it('never exceeds the configured cap', () => {
        assert.equal(
            service.getSendTaskTimeout({ dataSize: 100 * 1024 * MB }),
            service.workerSendTaskTimeoutMax
        );
    });

    it('falls back to measuring data for tasks created before dataSize existed', () => {
        const task = { data: { blob: 'y'.repeat(4 * MB) } };
        assert.ok(service.getSendTaskTimeout(task) > service.workerSendTaskTimeout);
    });

    it('handles a task with neither dataSize nor data', () => {
        assert.equal(service.getSendTaskTimeout({}), service.workerSendTaskTimeout);
    });
});

describe('QueueService.releaseOrParkTask (no ORM, snapshot path)', () => {
    it('rejects at the lookup before mutating the caller-held snapshot', async () => {
        const task = await runReleaseOrPark(makeTask(), 'Timeout exceed (worker-1)');
        assert.equal(task.dispatchAttempt, 0);
    });
});

describe('QueueService.releaseOrParkTask (stubbed DB, re-read path)', () => {
    let calls;
    afterEach(() => calls?.restore());

    it('counts a dispatch failure - the counter that never advanced during the outage', async () => {
        calls = stubDb({ found: makeTask() });
        await service.releaseOrParkTask(makeTask(), 'Timeout exceed (worker-1)');
        assert.equal(calls.saved[0].dispatchAttempt, 1);
    });

    it('rolls the task back into the queue while budget remains', async () => {
        calls = stubDb({ found: makeTask() });
        await service.releaseOrParkTask(makeTask(), 'Timeout exceed (worker-1)');
        const saved = calls.saved[0];
        assert.equal(saved.processedTime, null);
        assert.equal(saved.sent, false);
        assert.equal(saved.isError, false);
        assert.equal(calls.published.length, 0);
    });

    it('dead-letters the task once the dispatch budget is exhausted and publishes TASK_COMPLETE', async () => {
        calls = stubDb({ found: makeTask({ dispatchAttempt: service.dispatchMaxAttempts - 1 }) });
        await service.releaseOrParkTask(makeTask(), 'Timeout exceed (worker-1)');

        const saved = calls.saved[0];
        assert.equal(saved.dispatchAttempt, service.dispatchMaxAttempts);
        assert.equal(saved.isError, true);
        assert.equal(saved.errorReason, 'Timeout exceed (worker-1)');
        assert.equal(saved.sent, false);
        // refreshAndReassignTasks filters on processedTime: null and isError: { $ne: true }.
        assert.notEqual(saved.processedTime, null);
        // leaves done false so the task still shows as ERROR and stays restartable via RESTART_TASK.
        assert.equal(saved.done, false);

        assert.equal(calls.published.length, 1);
        assert.equal(calls.published[0].subject, QueueEvents.TASK_COMPLETE);
        assert.equal(calls.published[0].data.id, 't-1');
        assert.equal(calls.published[0].data.error, 'Timeout exceed (worker-1)');
    });

    it('parks a non-retryable task on the same dispatch budget', async () => {
        calls = stubDb({
            found: makeTask({ isRetryableTask: false, attempts: 0, dispatchAttempt: service.dispatchMaxAttempts - 1 }),
        });
        await service.releaseOrParkTask(makeTask({ isRetryableTask: false, attempts: 0 }), 'boom');
        assert.equal(calls.saved[0].isError, true);
    });

    it('does not consume the worker-error retry budget', async () => {
        calls = stubDb({ found: makeTask({ attempt: 1 }) });
        await service.releaseOrParkTask(makeTask({ attempt: 1 }), 'Timeout exceed (worker-1)');
        assert.equal(calls.saved[0].attempt, 1);
    });

    // dispatchClaimedTask can hold the claimed snapshot across an await up to
    // workerSendTaskTimeoutMax (5m). If the worker's TASK_COMPLETE beat the timeout back to the
    // queue, `done`/`isError` are already true in the DB - writing the stale snapshot must not
    // revert that, and no spurious dead-letter TASK_COMPLETE must be published on top of a success.

    it('does not revert an already-completed task and does not save', async () => {
        calls = stubDb({ found: makeTask({ done: true }) });
        await service.releaseOrParkTask(makeTask(), 'Timeout exceed (worker-1)');
        assert.equal(calls.saved.length, 0);
        assert.equal(calls.published.length, 0);
    });

    it('does not double dead-letter a task that was already dead-lettered', async () => {
        calls = stubDb({ found: makeTask({ isError: true, errorReason: 'first failure' }) });
        await service.releaseOrParkTask(makeTask(), 'Timeout exceed (worker-1)');
        assert.equal(calls.saved.length, 0);
        assert.equal(calls.published.length, 0);
    });

    it('does nothing if the task was deleted in the meantime', async () => {
        calls = stubDb({ found: null });
        await service.releaseOrParkTask(makeTask(), 'Timeout exceed (worker-1)');
        assert.equal(calls.saved.length, 0);
        assert.equal(calls.published.length, 0);
    });
});

describe('QueueService.resetDispatchAttempt (stubbed DB)', () => {
    let calls;
    afterEach(() => calls?.restore());

    it('resets the dispatch budget for a task still in flight', async () => {
        calls = stubDb({ found: makeTask({ dispatchAttempt: 2 }) });
        await service.resetDispatchAttempt('t-1');
        assert.equal(calls.saved[0].dispatchAttempt, 0);
    });

    // A late-arriving success ack must not resurrect/overwrite a task that has since been
    // dead-lettered or completed by another path.
    it('does not touch a task that already reached a terminal state', async () => {
        calls = stubDb({ found: makeTask({ dispatchAttempt: 2, isError: true }) });
        await service.resetDispatchAttempt('t-1');
        assert.equal(calls.saved.length, 0);
    });

    it('does nothing if the task no longer exists', async () => {
        calls = stubDb({ found: null });
        await service.resetDispatchAttempt('t-1');
        assert.equal(calls.saved.length, 0);
    });
});

describe('QueueService.releaseClaim (stubbed DB)', () => {
    let calls;
    afterEach(() => calls?.restore());

    it('releases the claim for a task still in flight, leaving the dispatch budget untouched', async () => {
        calls = stubDb({ found: makeTask({ dispatchAttempt: 1 }) });
        await service.releaseClaim('t-1');
        assert.equal(calls.saved[0].processedTime, null);
        assert.equal(calls.saved[0].sent, false);
        assert.equal(calls.saved[0].dispatchAttempt, 1);
    });

    it('does not touch a task that already reached a terminal state', async () => {
        calls = stubDb({ found: makeTask({ isError: true }) });
        await service.releaseClaim('t-1');
        assert.equal(calls.saved.length, 0);
    });

    it('does nothing if the task no longer exists', async () => {
        calls = stubDb({ found: null });
        await service.releaseClaim('t-1');
        assert.equal(calls.saved.length, 0);
    });
});

describe('QueueService.inFlightWorkers', () => {
    // refreshAndReassignTasks adds a worker's subject before dispatching and removes it once
    // dispatchClaimedTask settles (see the .finally() in refreshAndReassignTasks) - this is what
    // lets the loop skip a worker GET_FREE_WORKERS still reports free mid-decode of a large
    // out-of-band payload. Exercised directly since the loop itself depends on NATS pub/sub.
    it('starts empty', () => {
        assert.equal(service.inFlightWorkers.size, 0);
    });

    it('is a Set keyed by worker subject', () => {
        service.inFlightWorkers.add('w-1');
        assert.ok(service.inFlightWorkers.has('w-1'));
        service.inFlightWorkers.delete('w-1');
        assert.ok(!service.inFlightWorkers.has('w-1'));
    });
});

describe('QueueService.dispatchClaimedTask (stubbed DB + transport)', () => {
    let calls;
    let originalSend;

    beforeEach(() => {
        originalSend = service.sendMessageWithTimeout;
    });
    afterEach(() => {
        service.sendMessageWithTimeout = originalSend;
        calls?.restore();
    });

    // A busy worker replies `{ result: false }` from its `isInUse` guard (see
    // worker-service SEND_TASK_TO_WORKER) - that is an expected outcome of a worker reported
    // free by getFreeWorkers() becoming busy again before the send lands, not a failed
    // hand-off, and must not burn the dead-letter budget.
    it('releases a busy-worker response via a fresh read, not the stale snapshot', async () => {
        service.sendMessageWithTimeout = async () => ({ result: false });
        calls = stubDb({ found: makeTask({ dispatchAttempt: 0 }) });

        const task = makeTask({ dispatchAttempt: 0 });
        await service.dispatchClaimedTask({ subject: 'w-1' }, task, { id: 't-1' }, 1000);

        assert.equal(calls.findOneFilters.length, 1);
        assert.equal(calls.saved.length, 1);
        assert.equal(calls.saved[0].dispatchAttempt, 0);
        assert.equal(calls.saved[0].processedTime, null);
        assert.equal(calls.saved[0].sent, false);
        assert.equal(calls.published.length, 0);
    });

    it('does not revert an already-completed task on a busy-worker response', async () => {
        service.sendMessageWithTimeout = async () => ({ result: false });
        calls = stubDb({ found: makeTask({ done: true }) });

        const task = makeTask();
        await service.dispatchClaimedTask({ subject: 'w-1' }, task, { id: 't-1' }, 1000);

        assert.equal(calls.saved.length, 0);
    });

    it('routes a transport error through releaseOrParkTask and counts it', async () => {
        service.sendMessageWithTimeout = async () => { throw new Error('Timeout exceed (w-1)'); };
        calls = stubDb({ found: makeTask({ dispatchAttempt: 0 }) });

        const task = makeTask({ dispatchAttempt: 0 });
        await service.dispatchClaimedTask({ subject: 'w-1' }, task, { id: 't-1' }, 1000);

        assert.equal(calls.saved[0].dispatchAttempt, 1);
    });

    // A DISPATCH_TIMEOUT means the ack deadline passed, not that the task was never delivered -
    // the worker only acks an out-of-band payload after fetching and parsing it in full, and a
    // genuinely hung worker times out regardless of delivery. Re-queueing on this (like a proven
    // transport error) could run a Hedera mint/transfer twice while the first attempt is still in
    // flight, so it must leave the claim untouched instead of going through releaseOrParkTask.
    it('leaves the claim untouched on an ack timeout instead of re-queueing or dead-lettering', async () => {
        const error = new Error('Timeout exceed (w-1)');
        error.code = 'DISPATCH_TIMEOUT';
        service.sendMessageWithTimeout = async () => { throw error; };
        calls = stubDb({ found: makeTask({ dispatchAttempt: 0 }) });

        const task = makeTask({ dispatchAttempt: 0 });
        await service.dispatchClaimedTask({ subject: 'w-1' }, task, { id: 't-1' }, 1000);

        assert.equal(calls.findOneFilters.length, 0);
        assert.equal(calls.saved.length, 0);
        assert.equal(calls.published.length, 0);
    });

    it('resets the dispatch budget on success via a fresh read, not the stale snapshot', async () => {
        service.sendMessageWithTimeout = async () => ({ result: true });
        calls = stubDb({ found: makeTask({ dispatchAttempt: 2 }) });

        const staleTask = makeTask({ dispatchAttempt: 2 });
        await service.dispatchClaimedTask({ subject: 'w-1' }, staleTask, { id: 't-1' }, 1000);

        assert.equal(calls.findOneFilters.length, 1);
        assert.equal(calls.saved[0].dispatchAttempt, 0);
    });

    it('does not write back on success when dispatchAttempt was already zero', async () => {
        service.sendMessageWithTimeout = async () => ({ result: true });
        calls = stubDb();

        const task = makeTask({ dispatchAttempt: 0 });
        await service.dispatchClaimedTask({ subject: 'w-1' }, task, { id: 't-1' }, 1000);

        assert.equal(calls.saved.length, 0);
    });
});

describe('QueueService.iTaskToTaskEntity dispatch bookkeeping', () => {
    it('initialises dispatchAttempt to zero', () => {
        const entity = service.iTaskToTaskEntity({ id: 'abc', dispatchAttempt: 9 });
        assert.equal(entity.dispatchAttempt, 0);
    });
});

describe('QueueService dispatch configuration', () => {
    it('exposes a finite dispatch budget so a task can always be given up on', () => {
        assert.ok(Number.isInteger(service.dispatchMaxAttempts));
        assert.ok(service.dispatchMaxAttempts > 0);
    });
});
