import assert from 'node:assert/strict';
import { HederaSDKHelper, NetworkOptions } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common';

describe('HederaSDKHelper.setNetwork', () => {
    afterEach(() => {
        Environment.setMirrorNodes([]);
        Environment.setNodes({});
        Environment.setNetwork('testnet');
    });

    it('returns the HederaSDKHelper class (chainable)', () => {
        const opts = new NetworkOptions();
        assert.equal(HederaSDKHelper.setNetwork(opts), HederaSDKHelper);
    });

    it('applies the network from the options to Environment', () => {
        const opts = new NetworkOptions();
        opts.network = 'mainnet';
        HederaSDKHelper.setNetwork(opts);
        assert.equal(Environment.network, 'mainnet');
    });

    it('applies testnet from options', () => {
        const opts = new NetworkOptions();
        opts.network = 'testnet';
        HederaSDKHelper.setNetwork(opts);
        assert.equal(Environment.network, 'testnet');
    });

    it('applies previewnet from options', () => {
        const opts = new NetworkOptions();
        opts.network = 'previewnet';
        HederaSDKHelper.setNetwork(opts);
        assert.equal(Environment.network, 'previewnet');
    });

    it('propagates nodes to Environment', () => {
        const opts = new NetworkOptions();
        opts.network = 'testnet';
        opts.nodes = { 'a:50211': '0.0.3' };
        HederaSDKHelper.setNetwork(opts);
        assert.deepEqual(Environment.nodes, { 'a:50211': '0.0.3' });
    });

    it('propagates mirrorNodes to Environment', () => {
        const opts = new NetworkOptions();
        opts.network = 'testnet';
        opts.mirrorNodes = ['https://m.example'];
        HederaSDKHelper.setNetwork(opts);
        assert.deepEqual(Environment.mirrorNodes, ['https://m.example']);
    });

    it('throws when given an unknown network', () => {
        const opts = new NetworkOptions();
        opts.network = 'nope';
        assert.throws(() => HederaSDKHelper.setNetwork(opts), /Unknown network: nope/);
    });
});

describe('HederaSDKHelper.setTransactionResponseCallback / transactionResponse', () => {
    afterEach(() => {
        HederaSDKHelper.setTransactionResponseCallback(null);
    });

    it('setTransactionResponseCallback is a static function', () => {
        assert.equal(typeof HederaSDKHelper.setTransactionResponseCallback, 'function');
    });

    it('invokes the registered synchronous callback with the account', () => {
        let seen;
        HederaSDKHelper.setTransactionResponseCallback((acc) => { seen = acc; });
        HederaSDKHelper.transactionResponse('0.0.5');
        assert.equal(seen, '0.0.5');
    });

    it('does nothing (no throw) when no callback is registered', () => {
        HederaSDKHelper.setTransactionResponseCallback(null);
        assert.doesNotThrow(() => HederaSDKHelper.transactionResponse('0.0.1'));
    });

    it('swallows a synchronous throw from the callback', () => {
        HederaSDKHelper.setTransactionResponseCallback(() => { throw new Error('boom'); });
        assert.doesNotThrow(() => HederaSDKHelper.transactionResponse('0.0.9'));
    });

    it('accepts an async callback without throwing', () => {
        HederaSDKHelper.setTransactionResponseCallback(async () => 'ok');
        assert.doesNotThrow(() => HederaSDKHelper.transactionResponse('0.0.2'));
    });

    it('swallows a rejected promise from an async callback', async () => {
        HederaSDKHelper.setTransactionResponseCallback(async () => { throw new Error('async boom'); });
        assert.doesNotThrow(() => HederaSDKHelper.transactionResponse('0.0.3'));
        await new Promise((r) => setTimeout(r, 5));
    });
});

describe('HederaSDKHelper.client', () => {
    before(() => {
        Environment.setMirrorNodes([]);
        Environment.setNodes({});
        Environment.setNetwork('testnet');
    });

    it('creates a client without an operator', () => {
        const client = HederaSDKHelper.client();
        assert.ok(client);
        assert.equal(client.operatorAccountId, null);
    });

    it('returns a client object with a setOperator method', () => {
        const client = HederaSDKHelper.client();
        assert.equal(typeof client.setOperator, 'function');
    });

    it('does not set operator when only operatorId is provided', () => {
        const client = HederaSDKHelper.client('0.0.2');
        assert.equal(client.operatorAccountId, null);
    });
});

describe('HederaSDKHelper.checkAccount — additional edge cases', () => {
    it('accepts 0.0.0', () => {
        assert.equal(HederaSDKHelper.checkAccount('0.0.0'), true);
    });

    it('rejects a trailing dot', () => {
        assert.equal(HederaSDKHelper.checkAccount('0.0.1.'), false);
    });

    it('rejects whitespace-only', () => {
        assert.equal(HederaSDKHelper.checkAccount('   '), false);
    });

    it('accepts a bare account number (shard/realm default to 0)', () => {
        assert.equal(HederaSDKHelper.checkAccount('123'), true);
    });

    it('returns false for the number 0 (falsy)', () => {
        assert.equal(HederaSDKHelper.checkAccount(0), false);
    });

    it('rejects negative components', () => {
        assert.equal(HederaSDKHelper.checkAccount('-1.0.1'), false);
    });
});
