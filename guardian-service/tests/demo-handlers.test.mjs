import assert from 'node:assert/strict';
import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';
import { loadAPI } from './_handler-harness.mjs';

describe('demo.service handlers', () => {
    const workerTasks = [];
    const background = [];
    let handlers;

    class RecordingWorkers {
        async addNonRetryableTask(task, options) {
            workerTasks.push({ task, options });
            return { id: '0.0.1001', key: 'private-key' };
        }
    }

    const notifier = {
        addStep() {}, start() {}, startStep() {}, completeStep() {}, complete() {},
        result() {}, fail() {},
    };

    before(async function () {
        this.timeout(120000);
        ({ handlers } = await loadAPI('../dist/api/demo.service.js', 'demoAPI', {
            '@guardian/common': {
                Workers: RecordingWorkers,
                SecretManager: { New: () => ({ getSecrets: async () => ({ OPERATOR_ID: '0.0.2', OPERATOR_KEY: 'operator-key' }) }) },
                NewNotifier: { empty: () => notifier, create: async () => notifier },
                // the async handler does not wait for its background work: keep it to join it
                RunFunctionAsync: (fn, onError) => {
                    const promise = (async () => {
                        try { await fn(() => {}); } catch (error) { await onError(error); }
                    })();
                    background.push(promise);
                    return promise;
                },
            },
        }));
    });

    beforeEach(() => {
        workerTasks.length = 0;
        background.length = 0;
    });

    describe('GENERATE_DEMO_KEY', () => {
        it('creates the account on behalf of the calling user', async () => {
            const response = await handlers[MessageAPI.GENERATE_DEMO_KEY]({ role: 'USER', userId: 'user-1' });

            assert.deepEqual(response.body, { id: '0.0.1001', key: 'private-key' });
            assert.equal(workerTasks.length, 1);
            assert.equal(workerTasks[0].task.type, WorkerTaskType.CREATE_ACCOUNT);
            assert.deepEqual(workerTasks[0].task.data.payload, { userId: 'user-1' });
            assert.equal(workerTasks[0].options.userId, 'user-1');
        });
    });

    describe('GENERATE_DEMO_KEY_ASYNC', () => {
        it('creates the account on behalf of the calling user', async () => {
            const response = await handlers[MessageAPI.GENERATE_DEMO_KEY_ASYNC]({ role: 'USER', task: { taskId: 't-1' }, userId: 'user-2' });
            await Promise.all(background);

            assert.deepEqual(response.body, { taskId: 't-1' });
            assert.equal(workerTasks.length, 1);
            assert.deepEqual(workerTasks[0].task.data.payload, { userId: 'user-2' });
            assert.equal(workerTasks[0].options.userId, 'user-2');
        });
    });
});
