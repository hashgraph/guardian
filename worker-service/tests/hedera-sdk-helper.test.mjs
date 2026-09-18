import assert from 'node:assert/strict';
import {
    HederaSDKHelper,
    NetworkOptions,
    MAX_FEE,
    INITIAL_BALANCE,
} from '../dist/api/helpers/hedera-sdk-helper.js';

describe('hedera-sdk-helper module constants', () => {
    it('MAX_FEE is a positive number', () => {
        assert.equal(typeof MAX_FEE, 'number');
        assert.ok(MAX_FEE > 0);
    });

    it('MAX_FEE defaults to 30', () => {
        assert.equal(MAX_FEE, 30);
    });

    it('INITIAL_BALANCE is 30', () => {
        assert.equal(INITIAL_BALANCE, 30);
    });
});

describe('HederaSDKHelper static constants', () => {
    it('REST_API_MAX_LIMIT is 100', () => {
        assert.equal(HederaSDKHelper.REST_API_MAX_LIMIT, 100);
    });

    it('MAX_TIMEOUT is a positive number', () => {
        assert.equal(typeof HederaSDKHelper.MAX_TIMEOUT, 'number');
        assert.ok(HederaSDKHelper.MAX_TIMEOUT > 0);
    });

    it('MAX_TIMEOUT defaults to 10 minutes (600000 ms)', () => {
        assert.equal(HederaSDKHelper.MAX_TIMEOUT, 600000);
    });
});

describe('HederaSDKHelper.checkAccount', () => {
    it('returns true for a valid account id 0.0.1', () => {
        assert.equal(HederaSDKHelper.checkAccount('0.0.1'), true);
    });

    it('returns true for a valid account id with large number', () => {
        assert.equal(HederaSDKHelper.checkAccount('0.0.123456'), true);
    });

    it('returns true for shard.realm.num form 1.2.3', () => {
        assert.equal(HederaSDKHelper.checkAccount('1.2.3'), true);
    });

    it('returns false for a malformed string', () => {
        assert.equal(HederaSDKHelper.checkAccount('not-an-account'), false);
    });

    it('returns false for a partial id', () => {
        assert.equal(HederaSDKHelper.checkAccount('0.0'), false);
    });

    it('returns false for an empty string', () => {
        assert.equal(HederaSDKHelper.checkAccount(''), false);
    });

    it('returns false for null', () => {
        assert.equal(HederaSDKHelper.checkAccount(null), false);
    });

    it('returns false for undefined', () => {
        assert.equal(HederaSDKHelper.checkAccount(undefined), false);
    });

    it('returns a boolean type for valid input', () => {
        assert.equal(typeof HederaSDKHelper.checkAccount('0.0.2'), 'boolean');
    });

    it('returns a boolean type for invalid input', () => {
        assert.equal(typeof HederaSDKHelper.checkAccount('@@@'), 'boolean');
    });
});

describe('NetworkOptions defaults', () => {
    it('constructs with default network "testnet"', () => {
        const opts = new NetworkOptions();
        assert.equal(opts.network, 'testnet');
    });

    it('defaults localNodeAddress to an empty string', () => {
        const opts = new NetworkOptions();
        assert.equal(opts.localNodeAddress, '');
    });

    it('defaults localNodeProtocol to an empty string', () => {
        const opts = new NetworkOptions();
        assert.equal(opts.localNodeProtocol, '');
    });

    it('defaults nodes to an empty object', () => {
        const opts = new NetworkOptions();
        assert.deepEqual(opts.nodes, {});
    });

    it('defaults mirrorNodes to an empty array', () => {
        const opts = new NetworkOptions();
        assert.deepEqual(opts.mirrorNodes, []);
    });

    it('produces independent instances (no shared object refs)', () => {
        const a = new NetworkOptions();
        const b = new NetworkOptions();
        a.nodes.x = '0.0.5';
        a.mirrorNodes.push('m');
        assert.deepEqual(b.nodes, {});
        assert.deepEqual(b.mirrorNodes, []);
    });

    it('allows mutation of network field', () => {
        const opts = new NetworkOptions();
        opts.network = 'mainnet';
        assert.equal(opts.network, 'mainnet');
    });
});

describe('HederaSDKHelper.setTransactionLogSender', () => {
    it('is a static function', () => {
        assert.equal(typeof HederaSDKHelper.setTransactionLogSender, 'function');
    });

    it('accepts a function without throwing', () => {
        assert.doesNotThrow(() => HederaSDKHelper.setTransactionLogSender(async () => undefined));
    });
});
