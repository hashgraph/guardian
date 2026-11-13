import assert from 'node:assert/strict';
import { ContractAPI, WorkerTaskType } from '@guardian/interfaces';
import { loadAPI, makeDb } from './_handler-harness.mjs';

// SET_RETIRE_POOLS changes the retire contract on-chain and then reads each token back from the
// mirror node to store the pool. A token the mirror node has not indexed yet makes that read fail,
// and the caller must not be told "failed" for a call whose on-chain half already happened.
describe('SET_RETIRE_POOLS', () => {
    const tasks = [];
    let tokenInfoFails;
    let handlers;

    class RecordingWorkers {
        async addRetryableTask(task) {
            tasks.push(task);
            if (task.type === WorkerTaskType.GET_TOKEN_INFO && tokenInfoFails) {
                throw new Error('Request failed with status code 404');
            }
            return { wipe_key: { _type: 'ED25519' }, type: 'FUNGIBLE_COMMON', symbol: 'T', decimals: 0 };
        }
        async addNonRetryableTask(task) {
            tasks.push(task);
            return {};
        }
    }

    before(async function () {
        this.timeout(120000);
        const db = makeDb();
        db.sink.findOne.Contract = { contractId: '0.0.500', version: '1.0.1', wipeContractIds: [], wipeTokenIds: [] };
        ({ handlers } = await loadAPI('../dist/api/contract.service.js', 'contractAPI', {
            __db: db,
            '@guardian/common': {
                Workers: RecordingWorkers,
                Users: class { async getUserById() { return { id: 'u-1', walletToken: 'w', hederaAccountId: '0.0.7' }; } },
                Wallet: class { async getKey() { return 'root-key'; } },
            },
        }, [], [new db.DatabaseServer(), { error: async () => undefined }]));
    });

    beforeEach(() => {
        tasks.length = 0;
        tokenInfoFails = false;
    });

    const setPool = () => handlers[ContractAPI.SET_RETIRE_POOLS]({
        owner: { id: 'u-1', creator: 'did:owner' },
        id: 'contract-1',
        options: { tokens: [{ token: '0.0.900', count: 1 }], immediately: false },
    });

    it('sets the pool on the contract and answers once the token has been read', async () => {
        const response = await setPool();

        assert.equal(response.type, 'response');
        assert.equal(tasks.some((task) => task.type === WorkerTaskType.CUSTOM_CONTRACT_CALL), true);
        assert.equal(tasks.some((task) => task.type === WorkerTaskType.GET_TOKEN_INFO), true);
    });

    it('reads the token before it touches the contract', async () => {
        await setPool();

        const firstTokenRead = tasks.findIndex((task) => task.type === WorkerTaskType.GET_TOKEN_INFO);
        const contractCall = tasks.findIndex((task) => task.type === WorkerTaskType.CUSTOM_CONTRACT_CALL);
        assert.ok(firstTokenRead >= 0 && firstTokenRead < contractCall);
    });

    it('does not change the contract when the token cannot be read from the mirror node', async () => {
        tokenInfoFails = true;

        const response = await setPool();

        assert.equal(response.type, 'error');
        assert.match(response.error, /404/);
        assert.equal(tasks.some((task) => task.type === WorkerTaskType.CUSTOM_CONTRACT_CALL), false);
    });
});
