import { assert } from 'chai';
import { PrivateKey } from '@hiero-ledger/sdk';

import { HederaEd25519Method } from '../../../../../dist/hedera-modules/vcjs/did/components/hedera-ed25519-method.js';
import { VerificationMethod } from '../../../../../dist/hedera-modules/vcjs/did/components/verification-method.js';

const DID = 'did:hedera:testnet:8x9abcDEF_0.0.1';

describe('HederaEd25519Method.generateKeyPair (offline, deterministic)', function () {
    let key;
    before(function () {
        key = PrivateKey.generate();
    });

    it('produces an id with the root key suffix', async function () {
        const kp = await HederaEd25519Method.generateKeyPair(DID, key);
        assert.equal(kp.id, DID + '#did-root-key');
    });

    it('sets the controller to the DID', async function () {
        const kp = await HederaEd25519Method.generateKeyPair(DID, key);
        assert.equal(kp.controller, DID);
    });

    it('sets the Ed25519 key type', async function () {
        const kp = await HederaEd25519Method.generateKeyPair(DID, key);
        assert.equal(kp.type, 'Ed25519VerificationKey2018');
    });

    it('encodes a base58 public key', async function () {
        const kp = await HederaEd25519Method.generateKeyPair(DID, key);
        assert.isString(kp.publicKey);
        assert.match(kp.publicKey, /^[1-9A-HJ-NP-Za-km-z]+$/);
    });

    it('encodes a base58 private key', async function () {
        const kp = await HederaEd25519Method.generateKeyPair(DID, key);
        assert.isString(kp.privateKey);
        assert.match(kp.privateKey, /^[1-9A-HJ-NP-Za-km-z]+$/);
    });

    it('is deterministic for the same key', async function () {
        const a = await HederaEd25519Method.generateKeyPair(DID, key);
        const b = await HederaEd25519Method.generateKeyPair(DID, key);
        assert.equal(a.publicKey, b.publicKey);
        assert.equal(a.privateKey, b.privateKey);
    });

    it('accepts a string private key', async function () {
        const kp = await HederaEd25519Method.generateKeyPair(DID, key.toString());
        assert.equal(kp.controller, DID);
        assert.isString(kp.publicKey);
    });

    it('produces matching public key for string and object key forms', async function () {
        const fromObject = await HederaEd25519Method.generateKeyPair(DID, key);
        const fromString = await HederaEd25519Method.generateKeyPair(DID, key.toString());
        assert.equal(fromObject.publicKey, fromString.publicKey);
    });

    it('rejects a missing did', async function () {
        let err;
        try {
            await HederaEd25519Method.generateKeyPair(null, key);
        } catch (e) {
            err = e;
        }
        assert.exists(err);
        assert.include(err.message, 'DID cannot be');
    });

    it('rejects a missing key', async function () {
        let err;
        try {
            await HederaEd25519Method.generateKeyPair(DID, null);
        } catch (e) {
            err = e;
        }
        assert.exists(err);
        assert.include(err.message, 'DID root key cannot be');
    });
});

describe('HederaEd25519Method.generate (offline, deterministic)', function () {
    let key;
    before(function () {
        key = PrivateKey.generate();
    });

    it('returns a HederaEd25519Method instance', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        assert.instanceOf(m, HederaEd25519Method);
        assert.instanceOf(m, VerificationMethod);
    });

    it('sets the id to the default root key id', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        assert.equal(m.getId(), HederaEd25519Method.defaultId(DID));
    });

    it('sets the controller and type', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        assert.equal(m.getController(), DID);
        assert.equal(m.getType(), 'Ed25519VerificationKey2018');
    });

    it('names the method with the root key name', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        assert.equal(m.getName(), '#did-root-key');
    });

    it('exposes a private key', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        assert.isTrue(m.hasPrivateKey());
        assert.isString(m.getPrivateKey());
    });

    it('serializes a public key in toObject', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        const obj = m.toObject();
        assert.equal(obj.id, HederaEd25519Method.defaultId(DID));
        assert.isString(obj.publicKeyBase58);
        assert.isUndefined(obj.privateKeyBase58);
    });

    it('includes private key in toObject when requested', async function () {
        const m = await HederaEd25519Method.generate(DID, key);
        const obj = m.toObject(true);
        assert.isString(obj.privateKeyBase58);
    });

    it('accepts a string private key', async function () {
        const m = await HederaEd25519Method.generate(DID, key.toString());
        assert.equal(m.getController(), DID);
        assert.isString(m.getPrivateKey());
    });

    it('compares equal to a freshly generated method from the same key', async function () {
        const a = await HederaEd25519Method.generate(DID, key);
        const b = await HederaEd25519Method.generate(DID, key);
        assert.isTrue(a.compare(b));
    });
});
