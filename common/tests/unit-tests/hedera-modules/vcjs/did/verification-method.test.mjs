import { assert } from 'chai';

import { VerificationMethod } from '../../../../../dist/hedera-modules/vcjs/did/components/verification-method.js';

describe('VerificationMethod', function () {
    const base = {
        id: 'did:hedera:testnet:abc#key-1',
        controller: 'did:hedera:testnet:abc',
        type: 'Ed25519VerificationKey2018',
        publicKeyBase58: 'pubKeyBase58'
    };

    it('from builds method and derives name', function () {
        const vm = VerificationMethod.from(base);
        assert.equal(vm.getId(), base.id);
        assert.equal(vm.getController(), base.controller);
        assert.equal(vm.getType(), base.type);
        assert.equal(vm.getName(), '#key-1');
        assert.equal(vm.getMethod(), '#key-1');
    });

    it('from throws on missing id', function () {
        assert.throws(() => VerificationMethod.from({ controller: 'c', type: 't' }), 'Invalid method format');
    });

    it('from throws on missing controller', function () {
        assert.throws(() => VerificationMethod.from({ id: 'i', type: 't' }), 'Invalid method format');
    });

    it('from throws on missing type', function () {
        assert.throws(() => VerificationMethod.from({ id: 'i', controller: 'c' }), 'Invalid method format');
    });

    it('toObject contains required fields and public key', function () {
        const vm = VerificationMethod.from(base);
        const obj = vm.toObject();
        assert.equal(obj.id, base.id);
        assert.equal(obj.controller, base.controller);
        assert.equal(obj.type, base.type);
        assert.equal(obj.publicKeyBase58, base.publicKeyBase58);
    });

    it('toObject omits private key by default', function () {
        const vm = VerificationMethod.from({ ...base, privateKeyBase58: 'secret' });
        const obj = vm.toObject();
        assert.isUndefined(obj.privateKeyBase58);
    });

    it('toObject includes private key when requested', function () {
        const vm = VerificationMethod.from({ ...base, privateKeyBase58: 'secret' });
        const obj = vm.toObject(true);
        assert.equal(obj.privateKeyBase58, 'secret');
    });

    it('hasPrivateKey reflects presence', function () {
        const vm1 = VerificationMethod.from(base);
        assert.isFalse(vm1.hasPrivateKey());
        const vm2 = VerificationMethod.from({ ...base, privateKeyBase58: 'secret' });
        assert.isTrue(vm2.hasPrivateKey());
    });

    it('getPrivateKey returns base58 key', function () {
        const vm = VerificationMethod.from({ ...base, privateKeyBase58: 'secret' });
        assert.equal(vm.getPrivateKey(), 'secret');
    });

    it('getPrivateKey returns jwk key first', function () {
        const vm = VerificationMethod.from({ ...base, privateKeyJwk: { k: 1 } });
        assert.deepEqual(vm.getPrivateKey(), { k: 1 });
    });

    it('setPrivateKey sets matching key kind', function () {
        const vm = VerificationMethod.from(base);
        vm.setPrivateKey('newSecret');
        assert.equal(vm.getPrivateKey(), 'newSecret');
    });

    it('compare equal methods returns true', function () {
        const a = VerificationMethod.from(base);
        const b = VerificationMethod.from(base);
        assert.isTrue(a.compare(b));
    });

    it('compare different methods returns false', function () {
        const a = VerificationMethod.from(base);
        const b = VerificationMethod.from({ ...base, publicKeyBase58: 'other' });
        assert.isFalse(a.compare(b));
    });

    it('compare with plain object', function () {
        const a = VerificationMethod.from(base);
        assert.isTrue(a.compare(a.toObject()));
    });

    it('fromArray converts objects', function () {
        const arr = VerificationMethod.fromArray([base]);
        assert.lengthOf(arr, 1);
        assert.instanceOf(arr[0], VerificationMethod);
    });

    it('fromArray keeps string links when allowed', function () {
        const arr = VerificationMethod.fromArray([base, 'did:hedera:testnet:abc#key-1'], true);
        assert.lengthOf(arr, 2);
        assert.equal(arr[1], 'did:hedera:testnet:abc#key-1');
    });

    it('fromArray drops string links when not allowed', function () {
        const arr = VerificationMethod.fromArray([base, 'link'], false);
        assert.lengthOf(arr, 1);
    });

    it('publicKeyJwk and multibase round-trip', function () {
        const vm = VerificationMethod.from({ ...base, publicKeyBase58: undefined, publicKeyMultibase: 'zMulti', publicKeyJwk: { kty: 'OKP' } });
        const obj = vm.toObject();
        assert.equal(obj.publicKeyMultibase, 'zMulti');
        assert.deepEqual(obj.publicKeyJwk, { kty: 'OKP' });
    });
});
