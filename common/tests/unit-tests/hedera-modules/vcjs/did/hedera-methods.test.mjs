import { assert } from 'chai';

import { HederaEd25519Method } from '../../../../../dist/hedera-modules/vcjs/did/components/hedera-ed25519-method.js';
import { HederaBBSMethod } from '../../../../../dist/hedera-modules/vcjs/did/components/hedera-bbs-method.js';
import { VerificationMethod } from '../../../../../dist/hedera-modules/vcjs/did/components/verification-method.js';

describe('HederaEd25519Method', function () {
    it('static constants', function () {
        assert.equal(HederaEd25519Method.DID_ROOT_KEY_NAME, '#did-root-key');
        assert.equal(HederaEd25519Method.DID_ROOT_KEY_TYPE, 'Ed25519VerificationKey2018');
        assert.equal(HederaEd25519Method.TYPE, 'Ed25519VerificationKey2018');
    });

    it('extends VerificationMethod', function () {
        const m = new HederaEd25519Method();
        assert.instanceOf(m, VerificationMethod);
    });

    it('defaultId appends root key name', function () {
        assert.equal(HederaEd25519Method.defaultId('did:hedera:testnet:abc'), 'did:hedera:testnet:abc#did-root-key');
    });

    it('private key getter/setter use base58', function () {
        const m = new HederaEd25519Method();
        m.setPrivateKey('secret58');
        assert.equal(m.getPrivateKey(), 'secret58');
    });

    it('generateKeyPair rejects missing did', async function () {
        let err;
        try {
            await HederaEd25519Method.generateKeyPair(null, 'key');
        } catch (e) {
            err = e;
        }
        assert.exists(err);
        assert.include(err.message, 'DID cannot be');
    });

    it('generateKeyPair rejects missing key', async function () {
        let err;
        try {
            await HederaEd25519Method.generateKeyPair('did:x', null);
        } catch (e) {
            err = e;
        }
        assert.exists(err);
        assert.include(err.message, 'DID root key cannot be');
    });
});

describe('HederaBBSMethod', function () {
    it('static constants', function () {
        assert.equal(HederaBBSMethod.DID_ROOT_KEY_NAME, '#did-root-key-bbs');
        assert.equal(HederaBBSMethod.DID_ROOT_KEY_TYPE, 'Bls12381G2Key2020');
        assert.equal(HederaBBSMethod.TYPE, 'Bls12381G2Key2020');
    });

    it('extends VerificationMethod', function () {
        const m = new HederaBBSMethod();
        assert.instanceOf(m, VerificationMethod);
    });

    it('defaultId appends bbs root key name', function () {
        assert.equal(HederaBBSMethod.defaultId('did:hedera:testnet:abc'), 'did:hedera:testnet:abc#did-root-key-bbs');
    });

    it('private key getter/setter use base58', function () {
        const m = new HederaBBSMethod();
        m.setPrivateKey('bbsSecret');
        assert.equal(m.getPrivateKey(), 'bbsSecret');
    });

    it('generateKeyPair rejects missing did', async function () {
        let err;
        try {
            await HederaBBSMethod.generateKeyPair(undefined, 'key');
        } catch (e) {
            err = e;
        }
        assert.exists(err);
        assert.include(err.message, 'DID cannot be');
    });

    it('generateKeyPair rejects missing key', async function () {
        let err;
        try {
            await HederaBBSMethod.generateKeyPair('did:x', undefined);
        } catch (e) {
            err = e;
        }
        assert.exists(err);
        assert.include(err.message, 'DID root key cannot be');
    });
});
