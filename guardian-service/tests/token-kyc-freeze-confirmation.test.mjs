import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { MessageAPI, WorkerTaskType } from '@guardian/interfaces';
import { loadAPI, makeDb } from './_handler-harness.mjs';

// The KYC and freeze transactions resolve only once their receipt confirms them, so the account
// state read right after already reflects them: the answer must not wait on a timer.
describe('KYC and freeze answers', () => {
    const TOKEN_ID = '0.0.900';
    const USER_ACCOUNT_ID = '0.0.7';
    const tasks = [];
    let handlers;

    class ConfirmingWorkers {
        async addNonRetryableTask(task) {
            tasks.push(task);
            if (task.type === WorkerTaskType.GET_ACCOUNT_INFO) {
                return { [TOKEN_ID]: { tokenId: TOKEN_ID, balance: '0', kyc: true, frozen: true } };
            }
            return true;
        }
        async addRetryableTask(task) {
            return this.addNonRetryableTask(task);
        }
    }

    const silentNotifier = new Proxy({}, { get: () => () => undefined });

    before(async function () {
        this.timeout(120000);
        const db = makeDb();
        db.sink.findOne.Token = { id: 'token-1', tokenId: TOKEN_ID, tokenName: 'T', enableKYC: true, enableFreeze: true };
        ({ handlers } = await loadAPI('../dist/api/token.service.js', 'tokenAPI', {
            __db: db,
            '@guardian/common': {
                Workers: ConfirmingWorkers,
                NewNotifier: { empty: () => silentNotifier },
                Users: class {
                    async getUser() { return { id: 'u-2', hederaAccountId: USER_ACCOUNT_ID }; }
                    async getHederaAccount() { return { hederaAccountId: '0.0.1', hederaAccountKey: 'root-key' }; }
                },
            },
        }, [], [new db.DatabaseServer(), { error: async () => undefined }]));
    });

    beforeEach(() => {
        tasks.length = 0;
        mock.timers.enable({ apis: ['setTimeout'] });
    });

    afterEach(() => {
        mock.timers.reset();
    });

    // Lets the handler's promise chain run as far as it can while no timer is allowed to fire.
    const answerWithoutTimers = async (pending) => {
        const outcome = { settled: false, value: undefined };
        pending.then((value) => {
            outcome.settled = true;
            outcome.value = value;
        });
        for (let turn = 0; turn < 100 && !outcome.settled; turn++) {
            await new Promise((resolve) => setImmediate(resolve));
        }
        assert.equal(outcome.settled, true, 'answered without waiting on a timer');
        return outcome.value;
    };

    const owner = { id: 'u-1', creator: 'did:owner', owner: 'did:owner' };

    it('answers a KYC grant as soon as the transaction is confirmed', async () => {
        const response = await answerWithoutTimers(handlers[MessageAPI.KYC_TOKEN]({ tokenId: TOKEN_ID, username: 'user', owner, grant: true }));

        assert.equal(response.type, 'response', JSON.stringify(response));
        assert.equal(response.body.kyc, true);
        assert.ok(tasks.some((task) => task.type === WorkerTaskType.GRANT_KYC_TOKEN));
    });

    it('answers a freeze as soon as the transaction is confirmed', async () => {
        const response = await answerWithoutTimers(handlers[MessageAPI.FREEZE_TOKEN]({ tokenId: TOKEN_ID, username: 'user', owner, freeze: true }));

        assert.equal(response.type, 'response', JSON.stringify(response));
        assert.equal(response.body.frozen, true);
        assert.ok(tasks.some((task) => task.type === WorkerTaskType.FREEZE_TOKEN));
    });
});
