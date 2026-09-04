import assert from 'node:assert/strict';
import { ContractAPI, WorkerTaskType } from '@guardian/interfaces';
import { _contractCall } from '../../dist/api/helpers/contract-api.js';

const GAS_ENV_KEY = `${ContractAPI.CONTRACT_PERMISSIONS}_GAS`;

function stubWorkers() {
    const seen = [];
    return {
        seen,
        addNonRetryableTask: async (task, options) => {
            seen.push({ task, options });
            return 'worker-result';
        }
    };
}

function permissionsTask() {
    return {
        type: WorkerTaskType.CONTRACT_QUERY,
        data: {
            contractId: '0.0.1001',
            hederaAccountId: '0.0.1002',
            hederaAccountKey: 'test-key',
            functionName: 'permissions'
        }
    };
}

describe('CONTRACT_PERMISSIONS default gas', () => {
    let savedGasEnv;

    beforeEach(() => {
        savedGasEnv = process.env[GAS_ENV_KEY];
        delete process.env[GAS_ENV_KEY];
    });

    afterEach(() => {
        if (savedGasEnv === undefined) {
            delete process.env[GAS_ENV_KEY];
        } else {
            process.env[GAS_ENV_KEY] = savedGasEnv;
        }
    });

    it('resolves to 300000 when no environment override is set', async () => {
        const workers = stubWorkers();
        const task = permissionsTask();

        await _contractCall(ContractAPI.CONTRACT_PERMISSIONS, workers, task, 20);

        assert.equal(task.data.gas, 300000);
    });

    it('is not shadowed by a duplicate entry later in the map', async () => {
        const workers = stubWorkers();
        const task = permissionsTask();

        await _contractCall(ContractAPI.CONTRACT_PERMISSIONS, workers, task, 20);

        assert.notEqual(task.data.gas, 100000);
    });

    it('lets an environment override win over the map default', async () => {
        process.env[GAS_ENV_KEY] = '123456';
        const workers = stubWorkers();
        const task = permissionsTask();

        await _contractCall(ContractAPI.CONTRACT_PERMISSIONS, workers, task, 20);

        assert.equal(task.data.gas, 123456);
    });

    it('hands the same task and priority to the worker and returns its result', async () => {
        const workers = stubWorkers();
        const task = permissionsTask();

        const result = await _contractCall(ContractAPI.CONTRACT_PERMISSIONS, workers, task, 20);

        assert.equal(result, 'worker-result');
        assert.equal(workers.seen.length, 1);
        assert.equal(workers.seen[0].task, task);
        assert.deepEqual(workers.seen[0].options, { priority: 20 });
    });

    it('leaves the neighbouring SET_RETIRE_POOLS default untouched', async () => {
        const workers = stubWorkers();
        const task = permissionsTask();

        await _contractCall(ContractAPI.SET_RETIRE_POOLS, workers, task, 20);

        assert.equal(task.data.gas, 3000000);
    });
});
