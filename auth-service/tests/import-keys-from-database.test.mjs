import assert from 'node:assert/strict';
import esmock from 'esmock';

const state = {
    findCalls: [],
    wallets: [],
    setKeyCalls: [],
    setKeyThrows: false,
    infoLogs: [],
    errorLogs: [],
};

function reset() {
    state.findCalls = [];
    state.wallets = [];
    state.setKeyCalls = [];
    state.setKeyThrows = false;
    state.infoLogs = [];
    state.errorLogs = [];
}

class FakeDatabaseServer {
    async find(entity, filter) {
        state.findCalls.push([entity.name, filter]);
        return state.wallets;
    }
}

class HashicorpFake {
    async setKey(token, type, key, value) {
        if (state.setKeyThrows) {
            throw new Error('vault sealed');
        }
        state.setKeyCalls.push({ token, type, key, value });
    }
}

const logger = {
    async info(message, attr) {
        state.infoLogs.push([message, attr]);
    },
    async error(message, attr) {
        state.errorLogs.push([message, attr]);
    },
};

const { ImportKeysFromDatabase } = await esmock('../dist/helpers/import-keys-from-database.js', {
    '@guardian/common': { DatabaseServer: FakeDatabaseServer },
});

const originalProvider = process.env.VAULT_PROVIDER;

describe('@unit ImportKeysFromDatabase', () => {
    beforeEach(() => {
        reset();
        process.env.VAULT_PROVIDER = 'hashicorp';
    });

    after(() => {
        if (originalProvider === undefined) {
            delete process.env.VAULT_PROVIDER;
        } else {
            process.env.VAULT_PROVIDER = originalProvider;
        }
    });

    it('refuses to import into the database provider', async () => {
        process.env.VAULT_PROVIDER = 'database';
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.equal(state.errorLogs.length, 1);
        assert.match(state.errorLogs[0][0], /Cannot import to database provider/);
        assert.equal(state.findCalls.length, 0);
        assert.equal(state.setKeyCalls.length, 0);
    });

    it('queries wallet accounts whose type matches the KEY|suffix pattern', async () => {
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.equal(state.findCalls.length, 1);
        assert.equal(state.findCalls[0][0], 'WalletAccount');
        assert.ok(state.findCalls[0][1].type instanceof RegExp);
        assert.ok(state.findCalls[0][1].type.test('OPERATOR_KEY|did:1'));
        assert.ok(!state.findCalls[0][1].type.test('TOKEN|did:1'));
    });

    it('splits the stored type into vault type and key around the pipe', async () => {
        state.wallets = [{ token: 't-1', type: 'OPERATOR_KEY|did:user:9', key: 'priv' }];
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.deepEqual(state.setKeyCalls, [{ token: 't-1', type: 'OPERATOR_KEY', key: 'did:user:9', value: 'priv' }]);
    });

    it('imports every matched wallet account', async () => {
        state.wallets = [
            { token: 't-1', type: 'KEY|a', key: 'v1' },
            { token: 't-2', type: 'KEY|b', key: 'v2' },
            { token: 't-3', type: 'KEY|c', key: 'v3' },
        ];
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.equal(state.setKeyCalls.length, 3);
        assert.deepEqual(state.setKeyCalls.map((c) => c.key), ['a', 'b', 'c']);
    });

    it('logs how many keys were found', async () => {
        state.wallets = [
            { token: 't-1', type: 'KEY|a', key: 'v1' },
            { token: 't-2', type: 'KEY|b', key: 'v2' },
        ];
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.ok(state.infoLogs.some(([m]) => m === 'found 2 keys'));
    });

    it('logs success with the uppercased vault class name', async () => {
        state.wallets = [{ token: 't-1', type: 'KEY|a', key: 'v1' }];
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.ok(state.infoLogs.some(([m]) => m === '1 keys was added to HASHICORPFAKE'));
    });

    it('logs the vault error and resolves when setKey fails', async () => {
        state.wallets = [{ token: 't-1', type: 'KEY|a', key: 'v1' }];
        state.setKeyThrows = true;
        await assert.doesNotReject(ImportKeysFromDatabase(new HashicorpFake(), logger));
        assert.equal(state.errorLogs.length, 1);
        assert.match(state.errorLogs[0][0], /HASHICORPFAKE vault import error: vault sealed/);
    });

    it('completes with zero accounts without touching the vault', async () => {
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        assert.equal(state.setKeyCalls.length, 0);
        assert.ok(state.infoLogs.some(([m]) => m === 'found 0 keys'));
        assert.ok(state.infoLogs.some(([m]) => m === '0 keys was added to HASHICORPFAKE'));
    });

    it('tags every log line with the AUTH_SERVICE attribute', async () => {
        state.wallets = [{ token: 't-1', type: 'KEY|a', key: 'v1' }];
        await ImportKeysFromDatabase(new HashicorpFake(), logger);
        for (const [, attr] of state.infoLogs) {
            assert.deepEqual(attr, ['AUTH_SERVICE']);
        }
    });
});
