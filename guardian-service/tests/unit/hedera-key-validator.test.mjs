import { assert } from 'chai';
import esmock from 'esmock';

// the old check was inferred from a GET_USER_BALANCE probe whose result was discarded
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

    // the cases above stub checkHederaKey, so they would pass against a validator that
    // never validates; these run the real one and stub only the mirror-node read
    describe('with the real SDK and real checkHederaKey', () => {
        async function loadReal(mirrorKeyObject) {
            return await esmock(
                '../../dist/api/helpers/hedera-key-validator.js',
                {
                    '@guardian/common': {
                        Workers: class {
                            async addNonRetryableTask() { return { key: mirrorKeyObject }; }
                        },
                        // checkHederaKey deliberately NOT stubbed - the real one runs
                    },
                },
            );
        }

        it('accepts the key that actually controls the account', async () => {
            const { PrivateKey } = await import('@hiero-ledger/sdk');
            const key = PrivateKey.generateED25519();
            const { validateHederaAccountKey } = await loadReal({
                _type: 'ED25519', key: key.publicKey.toStringRaw(),
            });
            await validateHederaAccountKey('0.0.123', key.toStringDer());
        });

        it('rejects a key from a different account', async () => {
            // both keys parse; only one controls the account
            const { PrivateKey } = await import('@hiero-ledger/sdk');
            const owner = PrivateKey.generateED25519();
            const stranger = PrivateKey.generateED25519();
            const { validateHederaAccountKey } = await loadReal({
                _type: 'ED25519', key: owner.publicKey.toStringRaw(),
            });
            let failed = null;
            try {
                await validateHederaAccountKey('0.0.123', stranger.toStringDer());
            } catch (error) {
                failed = error;
            }
            assert.isNotNull(failed, 'a key from another account must not pass');
            assert.equal(failed.message, 'Invalid Hedera account or key.');
        });

        it('accepts an ECDSA key pair too', async () => {
            const { PrivateKey } = await import('@hiero-ledger/sdk');
            const key = PrivateKey.generateECDSA();
            const { validateHederaAccountKey } = await loadReal({
                _type: 'ECDSA_SECP256K1', key: key.publicKey.toStringRaw(),
            });
            await validateHederaAccountKey('0.0.123', key.toStringDer());
        });

        it('does not reject a threshold / key-list account', async () => {
            // ProtobufEncoded hex: PublicKey.fromString throws on it, so comparing
            // would reject a 1-of-N account that signs perfectly well later
            const { PrivateKey } = await import('@hiero-ledger/sdk');
            const member = PrivateKey.generateED25519();
            const { validateHederaAccountKey } = await loadReal({
                _type: 'ProtobufEncoded', key: '32af00112233445566778899aabbccddeeff',
            });
            await validateHederaAccountKey('0.0.123', member.toStringDer());
        });
    });

    it('keeps the underlying failure as the error cause', async () => {
        // Without this a NATS timeout, a mirror 5xx and a genuinely wrong key all
        // surface as one sentence, and only one of the three is the user's fault.
        const taskError = new Error('mirror down');
        const { validateHederaAccountKey } = await load({ taskError });
        let failed = null;
        try {
            await validateHederaAccountKey('0.0.123', 'priv-of-pub-1');
        } catch (error) {
            failed = error;
        }
        assert.equal(failed.message, 'Invalid Hedera account or key.');
        assert.equal(failed.cause, taskError, 'the original error must survive');
    });
});
