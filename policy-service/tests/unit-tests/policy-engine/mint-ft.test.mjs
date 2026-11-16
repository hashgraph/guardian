import assert from 'node:assert/strict';
import esmock from 'esmock';
import { MintTransactionStatus as Status, WorkerTaskType } from '@guardian/interfaces';

let handleTask;
const backups = [];
const loggedErrors = [];
class Workers {
    async addRetryableTask(task, options) { return handleTask(task, options); }
    sendExternalMintEvent() {}
}
const utils = { getErrorMessage: error => error.message };
const { TypedMint } = await esmock.strict('../../../dist/policy-engine/mint/types/typed-mint.js', {
    '@guardian/common/database-modules/database-server': { DatabaseServer: class {} },
    '@guardian/common/helpers/workers': { Workers },
    '../../../dist/policy-engine/mint/mint-service.js': {
        MintService: { log() {}, error: message => loggedErrors.push(message) }
    },
    '../../../dist/policy-engine/helpers/utils.js': { PolicyUtils: utils }
});
const { MintFT } = await esmock.strict('../../../dist/policy-engine/mint/types/mint-ft.js', {
    '@guardian/common/helpers/workers': { Workers },
    '../../../dist/policy-engine/mint/types/typed-mint.js': { TypedMint },
    '../../../dist/policy-engine/helpers/utils.js': { PolicyUtils: utils },
    '../../../dist/policy-engine/policy-components-utils.js': {
        PolicyComponentsUtils: { backup: id => backups.push(id) }
    }
});

function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function fixture(step, status = Status.NEW, dryRun = false) {
    const isMint = step === 'mint';
    const statusKey = isMint ? 'mintStatus' : 'transferStatus';
    const transactiontype = isMint ? 'TOKENMINT' : 'CRYPTOTRANSFER';
    const action = isMint ? WorkerTaskType.MINT_FT : WorkerTaskType.TRANSFER_FT;
    const request = {
        id: 'request', policyId: 'policy', amount: 17, memo: 'vp-message unique-memo',
        target: '0.0.3', isMintNeeded: isMint, isTransferNeeded: !isMint,
        startTransaction: '100.000000001'
    };
    const transaction = {
        mintRequestId: request.id, policyId: request.policyId, amount: request.amount,
        mintStatus: isMint ? status : Status.SUCCESS,
        transferStatus: isMint ? Status.NONE : status
    };
    if (status === Status.ERROR) transaction.error = 'receipt failed';
    const state = {
        request, transaction, statusKey, transactiontype, action, calls: [], events: [],
        savedRequests: [], savedTransactions: [], ledger: [], history: [], balance: 0,
        consensusResult: 'SUCCESS', failedResult: isMint ? 'TOKEN_MAX_SUPPLY_REACHED' : 'ACCOUNT_FROZEN_FOR_TOKEN',
        checkpoint: [{ consensus_timestamp: '200.000000001' }],
        found: undefined, checkpointError: null, lookupError: null,
        actionError: null, saveError: null, captureGate: null, saveGate: null
    };
    const matches = query => ['mintStatus', 'transferStatus'].every(key => {
        if (!query[key]) return true;
        if (query[key].$in) return query[key].$in.includes(transaction[key]);
        return query[key] === transaction[key];
    });
    const db = {
        async getMintTransaction(query) { return !state.transactionMissing && matches(query) ? transaction : null; },
        async getMintTransactions() {
            return [transaction.mintStatus, transaction.transferStatus].includes(Status.PENDING)
                ? [transaction] : [];
        },
        async getTransactionsCount(query) {
            const key = query.mintStatus ? 'mintStatus' : 'transferStatus';
            return query[key].$nin.includes(transaction[key]) ? 0 : 1;
        },
        async saveMintRequest(value) {
            if (state.saveGate) await state.saveGate.promise;
            if (state.saveError) throw state.saveError;
            state.savedRequests.push(structuredClone(value));
            state.events.push('request saved');
            return value;
        },
        async saveMintTransaction(value) {
            state.transactionMissing = false;
            Object.assign(transaction, value);
            state.savedTransactions.push(structuredClone(value));
            state.events.push(`${statusKey}:${value[statusKey]}`);
            return transaction;
        }
    };
    handleTask = async (task, options) => {
        state.calls.push(structuredClone({ task, options }));
        if (task.type === WorkerTaskType.GET_TRANSACTIONS) {
            if (task.data.filter) {
                if (state.lookupError && (!state.lookupErrorAt || state.lookups().length === state.lookupErrorAt)) {
                    throw state.lookupError;
                }
                return state.found ?? state.history.filter(record =>
                    record.transactiontype === task.data.transactiontype &&
                    record.memo_base64 === task.data.filter.memo_base64 &&
                    (!task.data.timestamp || timestampValue(record.consensus_timestamp) > timestampValue(task.data.timestamp.slice(3))))
                    .sort((a, b) => timestampValue(a.consensus_timestamp) < timestampValue(b.consensus_timestamp) ? -1 : 1)
                    .slice(0, task.data.limit);
            }
            if (state.captureGate) await state.captureGate.promise;
            if (state.checkpointError) throw state.checkpointError;
            return state.checkpoint;
        }
        state.events.push(task.type);
        const entry = {
            transactiontype: task.type === WorkerTaskType.MINT_FT ? 'TOKENMINT' : 'CRYPTOTRANSFER',
            consensus_timestamp: `${300 + state.history.length}.000000001`, memo_base64: btoa(task.data.transactionMemo),
            result: state.consensusResult
        };
        state.history.push(entry);
        if (entry.result !== 'SUCCESS') throw state.actionError ?? new Error(entry.result);
        state.ledger.push(entry);
        if (task.type === action) state.balance += task.data.tokenValue;
        if (state.actionError) throw state.actionError;
        return {};
    };
    const notifier = { success: async () => {}, error: async () => {} };
    state.mint = new MintFT(request, { hederaAccountId: '0.0.1', hederaAccountKey: 'key' }, {
        treasuryId: '0.0.2', tokenId: '0.0.4', supplyKey: 'supply', treasuryKey: 'treasury'
    }, db, { dryRun: dryRun ? 'dry-run' : null }, notifier, 'user');
    state.run = () => state.mint[isMint ? 'mintTokens' : 'transferTokens'](undefined, {
        userId: 'user', interception: 'interception'
    });
    state.actions = () => state.calls.filter(call => call.task.type === action);
    state.lookups = () => state.calls.filter(call => call.task.data.filter);
    return state;
}

function timestampValue(timestamp) {
    const [seconds, nanoseconds] = timestamp.split('.');
    return BigInt(seconds) * 1000000000n + BigInt(nanoseconds);
}

function record(fixture, result, timestamp) {
    return {
        transactiontype: fixture.transactiontype,
        memo_base64: btoa(fixture.request.memo),
        consensus_timestamp: timestamp,
        result
    };
}

describe('@unit fungible mint checkpoint and retry', () => {
    beforeEach(() => { backups.length = 0; loggedErrors.length = 0; });

    for (const step of ['mint', 'transfer']) {
        describe(step, () => {
            it('waits for the checkpoint response before marking pending or sending tokens', async () => {
                const f = fixture(step);
                f.captureGate = deferred();
                const running = f.run();
                await new Promise(setImmediate);
                try {
                    assert.equal(f.calls.length, 1);
                    assert.equal(f.transaction[f.statusKey], Status.NEW);
                    assert.equal(f.actions().length, 0);
                } finally {
                    f.captureGate.resolve();
                    await running;
                }
                assert.equal(f.request.startTransaction, '200.000000001');
                assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
            });

            it('waits for checkpoint persistence before marking pending or sending tokens', async () => {
                const f = fixture(step);
                f.saveGate = deferred();
                const running = f.run();
                await new Promise(setImmediate);
                try {
                    assert.equal(f.transaction[f.statusKey], Status.NEW);
                    assert.equal(f.actions().length, 0);
                } finally {
                    f.saveGate.resolve();
                    await running;
                }
                assert.deepEqual(f.events, ['request saved', `${f.statusKey}:PENDING`, f.action, `${f.statusKey}:SUCCESS`]);
            });

            for (const status of [Status.NEW, Status.ERROR]) {
                it(`does not send tokens when checkpoint lookup fails from ${status}`, async () => {
                    const f = fixture(step, status);
                    f.found = [];
                    f.checkpointError = new Error('mirror unavailable');
                    await assert.rejects(f.run(), error => error === f.checkpointError);
                    assert.equal(f.actions().length, 0);
                    assert.equal(f.transaction[f.statusKey], status);
                    assert.equal(f.request.startTransaction, '100.000000001');
                    assert.ok(loggedErrors.includes('mirror unavailable'));
                });
            }

            it('does not send tokens when checkpoint persistence fails', async () => {
                const f = fixture(step);
                f.saveError = new Error('save failed');
                await assert.rejects(f.run(), error => error === f.saveError);
                assert.equal(f.actions().length, 0);
                assert.equal(f.transaction[f.statusKey], Status.NEW);
            });

            it('saves an empty checkpoint and sends tokens for empty history', async () => {
                const f = fixture(step);
                f.checkpoint = [];
                await f.run();
                assert.equal(f.savedRequests[0].startTransaction, undefined);
                assert.equal(f.actions().length, 1);
                assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
            });

            it('preserves checkpoint and operation task parameters', async () => {
                const f = fixture(step);
                await f.run();
                assert.deepEqual(f.calls[0], {
                    task: { type: WorkerTaskType.GET_TRANSACTIONS, data: {
                        accountId: '0.0.2', limit: 1, order: 'desc',
                        transactiontype: f.transactiontype, payload: { userId: 'user' }
                    } },
                    options: { priority: 1, attempts: 10, userId: 'user', interception: 'interception', dryRun: null, mockId: null }
                });
                assert.equal(f.actions()[0].options.priority, 10);
                assert.equal(f.actions()[0].options.attempts, 0);
                assert.equal(f.actions()[0].task.data.transactionMemo, f.request.memo);
                assert.equal(f.actions()[0].task.data.tokenValue, f.request.amount);
            });

            it('recognizes an errored transaction without repeating it or moving its checkpoint', async () => {
                const f = fixture(step, Status.ERROR);
                f.found = [record(f, 'SUCCESS', '150.000000001')];
                await f.run();
                assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                assert.equal(f.transaction.error, undefined);
                assert.equal(f.savedTransactions.at(-1)[f.statusKey], Status.SUCCESS);
                assert.equal(f.calls.length, 1);
                assert.equal(f.actions().length, 0);
                assert.equal(f.request.startTransaction, '100.000000001');
                assert.deepEqual(backups, ['policy']);
                assert.equal(f.lookups()[0].task.data.timestamp, 'gt:100.000000001');
                assert.equal(f.lookups()[0].task.data.filter.memo_base64, btoa(f.request.memo));
            });

            it('checks an errored transaction before taking a new checkpoint and repeating it', async () => {
                const f = fixture(step, Status.ERROR);
                f.found = [];
                await f.run();
                assert.equal(f.calls.length, 3);
                assert.ok(f.calls[0].task.data.filter);
                assert.equal(f.calls[0].task.data.timestamp, 'gt:100.000000001');
                assert.equal(f.calls[1].task.data.order, 'desc');
                assert.equal(f.actions().length, 1);
                assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
            });

            it('keeps error status and sends nothing when retry lookup fails', async () => {
                const f = fixture(step, Status.ERROR);
                f.lookupError = new Error('lookup failed');
                await assert.rejects(f.run(), error => error === f.lookupError);
                assert.equal(f.calls.length, 1);
                assert.equal(f.actions().length, 0);
                assert.equal(f.transaction[f.statusKey], Status.ERROR);
                assert.equal(f.transaction.error, 'receipt failed');
                assert.equal(f.request.startTransaction, '100.000000001');
            });

            for (const found of [true, false]) {
                it(`resolves pending to ${found ? 'success' : 'new then sends once'} through the public mint flow`, async () => {
                    const f = fixture(step, Status.PENDING);
                    f.found = found ? [record(f, 'SUCCESS', '150.000000001')] : [];
                    assert.equal(await f.mint.mint({ userId: 'user' }), !found);
                    assert.equal(f.lookups().length, 1);
                    assert.equal(f.lookups()[0].task.data.timestamp, 'gt:100.000000001');
                    assert.equal(f.lookups()[0].task.data.transactiontype, f.transactiontype);
                    assert.equal(f.actions().length, found ? 0 : 1);
                    assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                });
            }

            it('keeps pending status when its resolution fails', async () => {
                const f = fixture(step, Status.PENDING);
                f.lookupError = new Error('lookup failed');
                await assert.rejects(f.mint.mint({ userId: 'user' }), error => error === f.lookupError);
                assert.equal(f.transaction[f.statusKey], Status.PENDING);
                assert.equal(f.actions().length, 0);
            });

            it('uses a memo-only retry lookup for a previously empty checkpoint', async () => {
                const f = fixture(step, Status.ERROR);
                f.request.startTransaction = undefined;
                f.found = [record(f, 'SUCCESS', '150.000000001')];
                await f.run();
                assert.equal(f.lookups()[0].task.data.timestamp, null);
                assert.equal(f.actions().length, 0);
            });

            for (const status of [Status.NEW, Status.ERROR, Status.PENDING]) {
                it(`performs dry run from ${status} without mirror lookups`, async () => {
                    const f = fixture(step, status, true);
                    await f.mint.mint({ userId: 'user' });
                    assert.equal(f.calls.length, 1);
                    assert.equal(f.actions().length, 1);
                    assert.equal(f.actions()[0].options.dryRun, 'dry-run');
                    assert.equal(f.request.startTransaction, '100.000000001');
                });
            }

            for (const status of [Status.ERROR, Status.PENDING]) {
                describe(`successful recovery from ${status}`, () => {
                    it('retries a real failed operation after its cause is corrected', async () => {
                        const f = fixture(step);
                        f.consensusResult = f.failedResult;
                        f.actionError = status === Status.PENDING
                            ? Object.assign(new Error('receipt timeout'), { isTimeoutError: true }) : null;
                        await assert.rejects(f.mint.mint({ userId: 'user' }));
                        assert.equal(f.transaction[f.statusKey], status);
                        assert.equal(f.ledger.length, 0);
                        assert.equal(f.balance, 0);
                        assert.equal(f.history[0].result, f.failedResult);

                        f.consensusResult = 'SUCCESS';
                        f.actionError = null;
                        await f.mint.mint({ userId: 'user' });

                        assert.equal(f.actions().length, 2);
                        assert.deepEqual(f.history.map(record => record.result), [f.failedResult, 'SUCCESS']);
                        assert.equal(f.ledger.length, 1);
                        assert.equal(f.balance, f.request.amount);
                        assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                        assert.equal(f.request.isMintNeeded, false);
                        assert.equal(f.request.isTransferNeeded, false);
                        assert.equal(f.request.error, undefined);
                        if (status === Status.PENDING) {
                            assert.ok(f.savedTransactions.some(value => value[f.statusKey] === Status.NEW));
                        }
                    });

                    it('finds success after a failed match without dispatching or replacing the checkpoint', async () => {
                        const f = fixture(step, status);
                        f.history.push(record(f, f.failedResult, '150.000000001'), record(f, 'SUCCESS', '160.000000001'));
                        await f.mint.mint({ userId: 'user' });
                        assert.equal(f.actions().length, 0);
                        assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                        assert.equal(f.request.isMintNeeded, false);
                        assert.equal(f.request.isTransferNeeded, false);
                        assert.equal(f.request.startTransaction, '100.000000001');
                        assert.ok(f.savedRequests.every(value => value.startTransaction === '100.000000001'));
                        assert.deepEqual(f.lookups().map(call => call.task.data.timestamp), ['gt:100.000000001', 'gt:150.000000001']);
                        for (const call of f.lookups()) {
                            assert.deepEqual(call.task.data.filter, { memo_base64: btoa(f.request.memo) });
                            assert.equal(call.task.data.limit, 1);
                            assert.equal(call.task.data.accountId, '0.0.2');
                            assert.equal(call.task.data.transactiontype, f.transactiontype);
                            assert.deepEqual(call.options, { priority: 1, attempts: 10, dryRun: null, mockId: null });
                        }
                    });

                    it('searches beyond twenty-five failed matches before deciding to dispatch', async () => {
                        const f = fixture(step, status);
                        for (let i = 0; i < 30; i++) {
                            f.history.push(record(f, f.failedResult, `150.${String(i).padStart(9, '0')}`));
                        }
                        f.history.push(record(f, 'SUCCESS', '160.000000001'));
                        await f.mint.mint({ userId: 'user' });
                        assert.equal(f.actions().length, 0);
                        assert.equal(f.lookups().length, 31);
                        assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                        assert.equal(f.request.startTransaction, '100.000000001');
                    });

                    it('exhausts failed matches before one fresh checkpoint and one successful operation', async () => {
                        const f = fixture(step, status);
                        f.history.push(record(f, f.failedResult, '150.000000001'), record(f, f.failedResult, '160.000000001'));
                        await f.mint.mint({ userId: 'user' });
                        assert.deepEqual(f.lookups().map(call => call.task.data.timestamp), [
                            'gt:100.000000001', 'gt:150.000000001', 'gt:160.000000001'
                        ]);
                        assert.equal(f.calls.length, 5);
                        assert.equal(f.calls[3].task.data.order, 'desc');
                        assert.equal(f.calls[4].task.type, f.action);
                        assert.equal(f.calls.filter(call => call.task.data.order === 'desc').length, 1);
                        assert.equal(f.ledger.length, 1);
                        assert.equal(f.balance, f.request.amount);
                        assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                        assert.equal(f.request.startTransaction, '200.000000001');
                    });

                    it('preserves the operation and saved checkpoint when a later lookup fails', async () => {
                        const f = fixture(step, status);
                        f.history.push(record(f, f.failedResult, '150.000000001'));
                        f.lookupError = new Error('mirror unavailable after first match');
                        f.lookupErrorAt = 2;
                        await assert.rejects(f.mint.mint({ userId: 'user' }), error => error === f.lookupError);
                        assert.equal(f.lookups().length, 2);
                        assert.equal(f.actions().length, 0);
                        assert.equal(f.transaction[f.statusKey], status);
                        assert.equal(f.savedTransactions.length, 0);
                        assert.equal(f.request.startTransaction, '100.000000001');
                        assert.ok(f.savedRequests.every(value => value.startTransaction === '100.000000001'));
                        assert.equal(f.balance, 0);
                    });

                    it('searches from an empty checkpoint without persisting its local cursor', async () => {
                        const f = fixture(step, status);
                        f.request.startTransaction = undefined;
                        f.history.push(record(f, f.failedResult, '150.000000001'), record(f, 'SUCCESS', '160.000000001'));
                        await f.mint.mint({ userId: 'user' });
                        assert.deepEqual(f.lookups().map(call => call.task.data.timestamp), [null, 'gt:150.000000001']);
                        assert.equal(f.actions().length, 0);
                        assert.equal(f.request.startTransaction, undefined);
                        assert.ok(f.savedRequests.every(value => value.startTransaction === undefined));
                    });

                    for (const [checkpoint, failed, succeeded] of [
                        ['1794770000.000000001', '1794770000.000000002', '1794770000.000000003'],
                        ['9.999999999', '10.000000000', '10.000000001']
                    ]) {
                        it(`advances precisely from ${checkpoint} to ${failed}`, async () => {
                            const f = fixture(step, status);
                            f.request.startTransaction = checkpoint;
                            f.history.push(record(f, f.failedResult, failed), record(f, 'SUCCESS', succeeded));
                            await f.mint.mint({ userId: 'user' });
                            assert.deepEqual(f.lookups().map(call => call.task.data.timestamp), [`gt:${checkpoint}`, `gt:${failed}`]);
                            assert.equal(f.actions().length, 0);
                            assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                            assert.equal(f.request.startTransaction, checkpoint);
                        });
                    }

                    for (const result of ['SUCCESS', 'TOKEN_MAX_SUPPLY_REACHED', 'ACCOUNT_FROZEN_FOR_TOKEN']) {
                        for (const timestamp of [undefined, '', 'invalid', '150.0000000000', '100.000000001', '99.999999999']) {
                            it(`rejects a ${result} match with invalid or non-advancing timestamp ${timestamp}`, async () => {
                                const f = fixture(step, status);
                                f.found = [record(f, result, timestamp)];
                                await assert.rejects(f.mint.mint({ userId: 'user' }), /transaction consensus timestamp|did not advance/);
                                assert.equal(f.lookups().length, 1);
                                assert.equal(f.actions().length, 0);
                                assert.equal(f.transaction[f.statusKey], status);
                                assert.equal(f.savedTransactions.length, 0);
                                assert.equal(f.request.startTransaction, '100.000000001');
                                assert.ok(f.savedRequests.every(value => value.startTransaction === '100.000000001'));
                            });
                        }
                    }

                    it('stops a repeated failed timestamp instead of looping or resending', async () => {
                        const f = fixture(step, status);
                        f.found = [record(f, f.failedResult, '150.000000001')];
                        f.lookupError = new Error('unexpected third lookup');
                        f.lookupErrorAt = 3;
                        await assert.rejects(f.mint.mint({ userId: 'user' }), /did not advance/);
                        assert.equal(f.lookups().length, 2);
                        assert.equal(f.actions().length, 0);
                        assert.equal(f.transaction[f.statusKey], status);
                        assert.equal(f.request.startTransaction, '100.000000001');
                        assert.ok(f.savedRequests.every(value => value.startTransaction === '100.000000001'));
                    });
                });
            }

            for (const timeout of [true, false]) {
                it(`does not duplicate tokens after a ${timeout ? 'timeout' : 'receipt error'} and public retry`, async () => {
                    const f = fixture(step);
                    f.actionError = Object.assign(new Error('receipt failed'), { isTimeoutError: timeout });
                    await assert.rejects(f.mint.mint({ userId: 'user' }), error => error === f.actionError);
                    assert.equal(f.transaction[f.statusKey], timeout ? Status.PENDING : Status.ERROR);
                    f.actionError = null;
                    await f.mint.mint({ userId: 'user' });
                    assert.equal(f.ledger.length, 1);
                    assert.equal(f.actions().length, 1);
                    assert.equal(f.transaction[f.statusKey], Status.SUCCESS);
                    assert.equal(f.request.error, undefined);
                });
            }
        });
    }

    it('mints then transfers once with separate awaited checkpoints and can retry a completed request', async () => {
        const f = fixture('mint');
        f.request.isTransferNeeded = true;
        f.transaction.transferStatus = Status.NEW;
        await f.mint.mint({ userId: 'user' });
        assert.deepEqual(f.calls.map(call => call.task.type), [
            WorkerTaskType.GET_TRANSACTIONS, WorkerTaskType.MINT_FT,
            WorkerTaskType.GET_TRANSACTIONS, WorkerTaskType.TRANSFER_FT
        ]);
        assert.deepEqual(f.calls.filter(call => call.task.data.order).map(call => call.task.data.transactiontype), ['TOKENMINT', 'CRYPTOTRANSFER']);
        assert.equal(f.transaction.mintStatus, Status.SUCCESS);
        assert.equal(f.transaction.transferStatus, Status.SUCCESS);
        assert.equal(await f.mint.mint({ userId: 'user' }), false);
        assert.equal(f.ledger.length, 2);
    });

    it('creates the first transaction and mints to the treasury without a transfer', async () => {
        const f = fixture('mint');
        f.transactionMissing = true;
        f.request.startTransaction = undefined;
        f.request.target = '0.0.2';
        await f.mint.mint({ userId: 'user' });
        assert.equal(f.savedTransactions[0].mintStatus, Status.NEW);
        assert.equal(f.transaction.transferStatus, Status.NONE);
        assert.equal(f.ledger.length, 1);
        assert.equal(f.ledger[0].transactiontype, 'TOKENMINT');
    });

    it('continues to transfer after recognizing a successful mint previously marked error', async () => {
        const f = fixture('mint', Status.ERROR);
        f.request.isTransferNeeded = true;
        f.transaction.transferStatus = Status.NEW;
        const minted = record(f, 'SUCCESS', '150.000000001');
        f.history.push(minted);
        f.ledger.push(minted);
        await f.mint.mint({ userId: 'user' });
        assert.equal(f.actions().length, 0);
        assert.equal(f.ledger.length, 2);
        assert.equal(f.ledger[1].transactiontype, 'CRYPTOTRANSFER');
        assert.equal(f.transaction.transferStatus, Status.SUCCESS);
        assert.equal(f.request.isMintNeeded, false);
        assert.equal(f.request.isTransferNeeded, false);
    });

    it('does not mint or transfer twice when only the transfer receipt fails', async () => {
        const f = fixture('mint');
        f.request.isTransferNeeded = true;
        f.transaction.transferStatus = Status.NEW;
        const originalTask = handleTask;
        handleTask = async (task, options) => {
            const result = await originalTask(task, options);
            if (task.type === WorkerTaskType.TRANSFER_FT) throw new Error('transfer receipt failed');
            return result;
        };
        await assert.rejects(f.mint.mint({ userId: 'user' }), /transfer receipt failed/);
        assert.equal(f.transaction.mintStatus, Status.SUCCESS);
        assert.equal(f.transaction.transferStatus, Status.ERROR);
        handleTask = originalTask;
        await f.mint.mint({ userId: 'user' });
        assert.equal(f.ledger.length, 2);
        assert.equal(f.transaction.transferStatus, Status.SUCCESS);
        assert.equal(f.actions().length, 1);
    });

});
