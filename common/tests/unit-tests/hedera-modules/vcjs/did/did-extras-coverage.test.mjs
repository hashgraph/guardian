import { assert } from 'chai';
import { PrivateKey, TopicId } from '@hiero-ledger/sdk';

import { HederaDid } from '../../../../../dist/hedera-modules/vcjs/did/hedera-did.js';
import { VerificationMethod } from '../../../../../dist/hedera-modules/vcjs/did/components/verification-method.js';

describe('HederaDid coverage', function () {
    const key = PrivateKey.generate();

    it('generate accepts a string topicId', async function () {
        const did = await HederaDid.generate('testnet', key, '0.0.123');
        assert.equal(did.getDidTopicId().toString(), '0.0.123');
        assert.equal(did.getNetwork(), 'testnet');
    });

    it('generate accepts a TopicId object', async function () {
        const did = await HederaDid.generate('testnet', key, TopicId.fromString('0.0.456'));
        assert.equal(did.getDidTopicId().toString(), '0.0.456');
    });

    it('generate accepts a string private key', async function () {
        const did = await HederaDid.generate('mainnet', key.toString(), null);
        assert.isNull(did.getDidTopicId());
        assert.equal(did.getNetwork(), 'mainnet');
    });

    it('from parses a V1 (parameter) DID with tid=', function () {
        const v1 = 'did:hedera:testnet:abcdefKEY;hedera:testnet:tid=0.0.789';
        const did = HederaDid.from(v1);
        assert.equal(did.getMethod(), 'hedera');
        assert.equal(did.getNetwork(), 'testnet');
        assert.equal(did.getDidTopicId().toString(), '0.0.789');
    });

    it('parseV1 throws on an invalid prefix', function () {
        assert.throws(
            () => HederaDid.parse('xid:hedera:testnet:abc;hedera:testnet:tid=0.0.1'),
            /invalid prefix/
        );
    });

    it('parseV1 throws on an invalid method', function () {
        assert.throws(
            () => HederaDid.parse('did:other:testnet:abc;hedera:testnet:tid=0.0.1'),
            /invalid method name/
        );
    });

    it('parse routes a leading-separator DID to parseV2', function () {
        assert.throws(() => HederaDid.parse(';did:hedera:testnet:abc'), /invalid did format/);
    });
});

describe('VerificationMethod coverage', function () {
    function jwkMethod() {
        return VerificationMethod.from({
            id: 'did:x#k1',
            controller: 'did:x',
            type: 'JsonWebKey2020',
            publicKeyJwk: { kty: 'OKP', x: 'pub' },
            privateKeyJwk: { kty: 'OKP', d: 'priv' }
        });
    }

    function multibaseMethod() {
        return VerificationMethod.from({
            id: 'did:x#k2',
            controller: 'did:x',
            type: 'Multikey',
            publicKeyMultibase: 'zPub',
            privateKeyMultibase: 'zPriv'
        });
    }

    it('getPrivateKey returns the jwk private key', function () {
        assert.deepEqual(jwkMethod().getPrivateKey(), { kty: 'OKP', d: 'priv' });
    });

    it('getPrivateKey returns the multibase private key', function () {
        assert.equal(multibaseMethod().getPrivateKey(), 'zPriv');
    });

    it('toObject includes jwk public and private keys when requested', function () {
        const obj = jwkMethod().toObject(true);
        assert.deepEqual(obj.publicKeyJwk, { kty: 'OKP', x: 'pub' });
        assert.deepEqual(obj.privateKeyJwk, { kty: 'OKP', d: 'priv' });
    });

    it('toObject includes multibase public and private keys when requested', function () {
        const obj = multibaseMethod().toObject(true);
        assert.equal(obj.publicKeyMultibase, 'zPub');
        assert.equal(obj.privateKeyMultibase, 'zPriv');
    });

    it('setPrivateKey assigns to the jwk slot when public jwk is present', function () {
        const m = VerificationMethod.from({
            id: 'did:x#k1', controller: 'did:x', type: 'JsonWebKey2020',
            publicKeyJwk: { kty: 'OKP', x: 'pub' }
        });
        m.setPrivateKey({ d: 'newpriv' });
        assert.deepEqual(m.getPrivateKey(), { d: 'newpriv' });
    });

    it('setPrivateKey assigns to the multibase slot when public multibase is present', function () {
        const m = VerificationMethod.from({
            id: 'did:x#k2', controller: 'did:x', type: 'Multikey',
            publicKeyMultibase: 'zPub'
        });
        m.setPrivateKey('zNewPriv');
        assert.equal(m.getPrivateKey(), 'zNewPriv');
    });

    it('from loads a multibase private key', function () {
        const m = multibaseMethod();
        assert.equal(m.toObject(true).privateKeyMultibase, 'zPriv');
    });

    it('compare returns false on a malformed input (catch path)', function () {
        const m = jwkMethod();
        assert.isFalse(m.compare(null));
    });
});
