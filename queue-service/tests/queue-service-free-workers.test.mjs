import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { DatabaseServer } from '@guardian/common';
import { QueueService } from '../dist/queue-service/queue-service.js';
import { WorkerEvents } from '@guardian/interfaces';

// QueueService is a singleton; a subclass is constructed afresh, so each test reads the
// environment it sets.
class FreshQueueService extends QueueService {}

const WINDOW_VARIABLE = 'WORKER_FREE_RESPONSE_WINDOW';

const workerReply = { subject: 'worker-1', minPriority: 0, maxPriority: 20 };

const withFakeBus = (service) => {
    const bus = { published: [], deliver: null };
    service.publish = async (subject, data) => {
        bus.published.push({ subject, data });
    };
    service.subscribe = (_subject, callback) => {
        bus.deliver = callback;
        return { unsubscribe: () => { bus.deliver = null; } };
    };
    return bus;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const settledState = (promise) => {
    const state = { settled: false, value: undefined };
    promise.then((value) => {
        state.settled = true;
        state.value = value;
    });
    return state;
};

describe('QueueService free-worker collection window', () => {
    let savedWindow;

    beforeEach(() => {
        savedWindow = process.env[WINDOW_VARIABLE];
        mock.timers.enable({ apis: ['setTimeout'] });
    });

    afterEach(() => {
        mock.timers.reset();
        if (savedWindow === undefined) {
            delete process.env[WINDOW_VARIABLE];
        } else {
            process.env[WINDOW_VARIABLE] = savedWindow;
        }
    });

    const collectFreeWorkers = async (windowMs) => {
        const service = new FreshQueueService();
        const bus = withFakeBus(service);
        const result = settledState(service.getFreeWorkers());
        bus.deliver(workerReply);

        mock.timers.tick(windowMs - 1);
        await flushPromises();
        assert.equal(result.settled, false, `still collecting replies after ${windowMs - 1} ms`);

        mock.timers.tick(1);
        await flushPromises();
        assert.equal(result.settled, true, `done collecting replies after ${windowMs} ms`);
        assert.deepEqual(result.value, [workerReply]);
    };

    it('collects free-worker replies for 300 ms by default', async () => {
        delete process.env[WINDOW_VARIABLE];
        await collectFreeWorkers(300);
    });

    it(`collects free-worker replies for the milliseconds set in ${WINDOW_VARIABLE}`, async () => {
        process.env[WINDOW_VARIABLE] = '50';
        await collectFreeWorkers(50);
    });
});

describe('QueueService.addTaskToQueue', () => {
    let originalCreate;
    let originalSave;

    beforeEach(() => {
        originalCreate = DatabaseServer.prototype.create;
        originalSave = DatabaseServer.prototype.save;
        DatabaseServer.prototype.create = function (_entityClass, item) { return { ...item }; };
        DatabaseServer.prototype.save = async function (_entityClass, item) { return item; };
    });

    afterEach(() => {
        DatabaseServer.prototype.create = originalCreate;
        DatabaseServer.prototype.save = originalSave;
    });

    it('asks for free workers as soon as a task is queued, without waiting for the refresh tick', async () => {
        const service = new FreshQueueService();
        const bus = withFakeBus(service);

        await service.addTaskToQueue({ id: 'task-1', type: 'send-hedera', priority: 10, data: {} });
        await flushPromises();

        assert.ok(
            bus.published.some(({ subject }) => subject === WorkerEvents.GET_FREE_WORKERS),
            'a dispatch round asked the workers whether they are free'
        );
    });
});
