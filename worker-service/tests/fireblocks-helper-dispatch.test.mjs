import assert from 'node:assert/strict';
import { FireblocksHelper } from '../dist/api/helpers/fireblocks-helper.js';

function makeHelper(overrides = {}) {
    const helper = new FireblocksHelper(
        overrides.apiKey ?? 'api-key',
        overrides.privateKey ?? 'priv-key',
        overrides.vaultId ?? 'vault-7',
        overrides.assetId ?? 'HBAR_TEST',
    );
    helper.delay = async () => null;
    return helper;
}

describe('@unit FireblocksHelper constructor / config', () => {
    let originalBaseUrl;

    beforeEach(() => {
        originalBaseUrl = process.env.FIREBLOCKS_BASEURL;
    });

    afterEach(() => {
        if (originalBaseUrl === undefined) {
            delete process.env.FIREBLOCKS_BASEURL;
        } else {
            process.env.FIREBLOCKS_BASEURL = originalBaseUrl;
        }
    });

    it('constructs and exposes an SDK client', () => {
        const helper = new FireblocksHelper('k', 'p', 'v', 'HBAR');
        assert.ok(helper.client);
        assert.equal(typeof helper.client.createTransaction, 'function');
        assert.equal(typeof helper.client.getTransactionById, 'function');
    });

    it('stores the constructor arguments on the instance', () => {
        const helper = new FireblocksHelper('AK', 'PK', 'V1', 'ASSET');
        assert.equal(helper.apiKey, 'AK');
        assert.equal(helper.privateKey, 'PK');
        assert.equal(helper.vaultId, 'V1');
        assert.equal(helper.assetId, 'ASSET');
    });

    it('constructs with the default base url when env is unset', () => {
        delete process.env.FIREBLOCKS_BASEURL;
        assert.doesNotThrow(() => new FireblocksHelper('k', 'p', 'v', 'HBAR'));
    });

    it('constructs with a custom base url from env', () => {
        process.env.FIREBLOCKS_BASEURL = 'https://sandbox.fireblocks.io';
        assert.doesNotThrow(() => new FireblocksHelper('k', 'p', 'v', 'HBAR'));
    });
});

describe('@unit FireblocksHelper.createTransaction — request mapping', () => {
    it('maps message bytes to a hex content payload', async () => {
        const helper = makeHelper();
        let received;
        helper.client.createTransaction = async (req) => {
            received = req;
            return { id: 'tx-1' };
        };
        helper.client.getTransactionById = async () => ({ status: 'COMPLETED' });
        await helper.createTransaction(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
        assert.equal(
            received.extraParameters.rawMessageData.messages[0].content,
            'deadbeef',
        );
    });

    it('sends operation RAW', async () => {
        const helper = makeHelper();
        let received;
        helper.client.createTransaction = async (req) => { received = req; return { id: 'tx' }; };
        helper.client.getTransactionById = async () => ({ status: 'COMPLETED' });
        await helper.createTransaction(new Uint8Array([1]));
        assert.equal(received.operation, 'RAW');
    });

    it('sets the source to the configured vault account', async () => {
        const helper = makeHelper({ vaultId: 'vault-99' });
        let received;
        helper.client.createTransaction = async (req) => { received = req; return { id: 'tx' }; };
        helper.client.getTransactionById = async () => ({ status: 'COMPLETED' });
        await helper.createTransaction(new Uint8Array([1]));
        assert.deepEqual(received.source, { type: 'VAULT_ACCOUNT', id: 'vault-99' });
    });

    it('passes the configured assetId through', async () => {
        const helper = makeHelper({ assetId: 'HBAR_PROD' });
        let received;
        helper.client.createTransaction = async (req) => { received = req; return { id: 'tx' }; };
        helper.client.getTransactionById = async () => ({ status: 'COMPLETED' });
        await helper.createTransaction(new Uint8Array([1]));
        assert.equal(received.assetId, 'HBAR_PROD');
    });

    it('encodes an empty message as an empty hex string', async () => {
        const helper = makeHelper();
        let received;
        helper.client.createTransaction = async (req) => { received = req; return { id: 'tx' }; };
        helper.client.getTransactionById = async () => ({ status: 'COMPLETED' });
        await helper.createTransaction(new Uint8Array([]));
        assert.equal(received.extraParameters.rawMessageData.messages[0].content, '');
    });

    it('queries the transaction id returned by createTransaction', async () => {
        const helper = makeHelper();
        helper.client.createTransaction = async () => ({ id: 'tx-xyz' });
        let queriedId;
        helper.client.getTransactionById = async (id) => { queriedId = id; return { status: 'COMPLETED' }; };
        await helper.createTransaction(new Uint8Array([1]));
        assert.equal(queriedId, 'tx-xyz');
    });
});

describe('@unit FireblocksHelper.createTransaction — result handling', () => {
    it('returns the completed transaction info', async () => {
        const helper = makeHelper();
        const completed = { id: 'tx', status: 'COMPLETED' };
        helper.client.createTransaction = async () => ({ id: 'tx' });
        helper.client.getTransactionById = async () => completed;
        const result = await helper.createTransaction(new Uint8Array([1]));
        assert.equal(result, completed);
    });

    it('polls until the transaction completes, then returns it', async () => {
        const helper = makeHelper();
        helper.client.createTransaction = async () => ({ id: 'tx' });
        const statuses = ['SUBMITTED', 'SUBMITTED', 'COMPLETED'];
        let i = 0;
        helper.client.getTransactionById = async () => ({ status: statuses[i++] });
        const result = await helper.createTransaction(new Uint8Array([1]));
        assert.equal(result.status, 'COMPLETED');
        assert.equal(i, 3);
    });

    it('swallows a FAILED-status error and resolves to undefined', async () => {
        const helper = makeHelper();
        helper.client.createTransaction = async () => ({ id: 'tx-f' });
        helper.client.getTransactionById = async () => ({ status: 'FAILED' });
        const result = await helper.createTransaction(new Uint8Array([1]));
        assert.equal(result, undefined);
    });

    it('swallows SDK errors from createTransaction and resolves to undefined', async () => {
        const helper = makeHelper();
        helper.client.createTransaction = async () => { throw new Error('boom'); };
        const result = await helper.createTransaction(new Uint8Array([1]));
        assert.equal(result, undefined);
    });
});

describe('@unit FireblocksHelper.getTransactionResult — status branches', () => {
    for (const status of ['CANCELLED', 'FAILED', 'BLOCKED', 'REJECTED']) {
        it(`throws for terminal status ${status}`, async () => {
            const helper = makeHelper();
            helper.client.getTransactionById = async () => ({ status });
            await assert.rejects(
                () => helper.getTransactionResult('tx-id'),
                new RegExp(`Fireblocks transaction "tx-id" failed with status ${status}`),
            );
        });
    }

    it('returns the info object directly on COMPLETED', async () => {
        const helper = makeHelper();
        const info = { status: 'COMPLETED', foo: 1 };
        helper.client.getTransactionById = async () => info;
        const out = await helper.getTransactionResult('tx-c');
        assert.equal(out, info);
    });

    it('recurses through non-terminal statuses before completing', async () => {
        const helper = makeHelper();
        const seq = ['PENDING_SIGNATURE', 'BROADCASTING', 'COMPLETED'];
        let i = 0;
        let delays = 0;
        helper.delay = async () => { delays++; return null; };
        helper.client.getTransactionById = async () => ({ status: seq[i++] });
        const out = await helper.getTransactionResult('tx-r');
        assert.equal(out.status, 'COMPLETED');
        assert.equal(delays, 2);
    });

    it('includes the transaction id in the failure message', async () => {
        const helper = makeHelper();
        helper.client.getTransactionById = async () => ({ status: 'REJECTED' });
        await assert.rejects(
            () => helper.getTransactionResult('abc-123'),
            /"abc-123"/,
        );
    });
});

describe('@unit FireblocksHelper.delay', () => {
    it('resolves (to undefined) after the timer elapses', async () => {
        const helper = new FireblocksHelper('k', 'p', 'v', 'HBAR');
        const out = await helper.delay(0);
        assert.equal(out, undefined);
    });
});
