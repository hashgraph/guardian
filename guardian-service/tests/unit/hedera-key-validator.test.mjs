import { assert } from 'chai';
import esmock from 'esmock';

/*
 * The key check used to be inferred from a GET_USER_BALANCE probe whose result was
 * discarded - it only held because the worker built a signing client. These cover the
 * direct check that replaces it.
 */
async function load({ accountKey, mirrorKey, taskError } = {}) {
    const calls = [];
    const { validateHederaAccountKey } = await esmock(
        '../../dist/api/helpers/hedera-key-validator.js',
        {
            '@guardian/common': {
                Workers: class {
                    constructor() { calls.push({ ctor: true }); }
                    async addNonRetryableTask(task, opts) {
                        calls.push({ task, opts });
                        if (taskError) { throw taskError; }
                        return { key: { _type: 'ED25519', key: mirrorKey } };
                    }
                },
                checkHederaKey: (priv, pub) => !!priv && !!pub && priv === `priv-of-${pub}`,
            },
            '@hiero-ledger/sdk': {
                AccountId: { fromString: (v) => { if (!String(v).startsWith('0.0.')) { throw new Error('bad account'); } } },
                PrivateKey: { fromString: (v) => { if (!v) { throw new Error('bad key'); } } },
            },
            '@guardian/interfaces': {
                WorkerTaskType: { GET_ACCOUNT_INFO_REST: 'get-account-info-rest' },
            },
        }
    );
    return { validateHederaAccountKey, calls };
}

describe('@unit validateHederaAccountKey', function () {
    // the first esmock load compiles the module graph and takes several seconds
    this.timeout(30000);

    it('accepts a key that matches the account s on-chain public key', async () => {
        const { validateHederaAccountKey } = await load({ mirrorKey: 'pub-1' });
        await validateHederaAccountKey('0.0.123', 'priv-of-pub-1');
    });

    // this is the case the balance probe could not see once it went keyless
    it('rejects a well-formed key that does not control the account', async () => {
        const { validateHederaAccountKey } = await load({ mirrorKey: 'pub-1' });
        let failed = null;
        try {
            await validateHederaAccountKey('0.0.123', 'priv-of-pub-other');
        } catch (error) {
            failed = error;
        }
        assert.isNotNull(failed, 'expected a rejection');
        assert.equal(failed.message, 'Invalid Hedera account or key.');
    });

    it('reads the account over the keyless REST task', async () => {
        const { validateHederaAccountKey, calls } = await load({ mirrorKey: 'pub-1' });
        await validateHederaAccountKey('0.0.123', 'priv-of-pub-1', { userId: 'u-1' });

        const task = calls.find((c) => c.task)?.task;
        assert.equal(task.type, 'get-account-info-rest');
        assert.equal(task.data.hederaAccountId, '0.0.123');
        // the key must never be sent to the worker
        assert.isUndefined(task.data.hederaAccountKey);
    });

    it('rejects a malformed account id', async () => {
        const { validateHederaAccountKey } = await load({ mirrorKey: 'pub-1' });
        let failed = null;
        try {
            await validateHederaAccountKey('nonsense', 'priv-of-pub-1');
        } catch (error) {
            failed = error;
        }
        assert.isNotNull(failed, 'expected a rejection');
        assert.equal(failed.message, 'Invalid Hedera account or key.');
    });

    it('rejects when the account cannot be read', async () => {
        const { validateHederaAccountKey } = await load({ taskError: new Error('mirror down') });
        let failed = null;
        try {
            await validateHederaAccountKey('0.0.123', 'priv-of-pub-1');
        } catch (error) {
            failed = error;
        }
        assert.isNotNull(failed, 'expected a rejection');
        assert.equal(failed.message, 'Invalid Hedera account or key.');
    });

    it('rejects when the account has no key on chain', async () => {
        const { validateHederaAccountKey } = await load({ mirrorKey: undefined });
        let failed = null;
        try {
            await validateHederaAccountKey('0.0.123', 'priv-of-pub-1');
        } catch (error) {
            failed = error;
        }
        assert.isNotNull(failed, 'expected a rejection');
        assert.equal(failed.message, 'Invalid Hedera account or key.');
    });
});
