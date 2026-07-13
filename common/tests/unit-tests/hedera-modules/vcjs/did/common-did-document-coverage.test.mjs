import { assert } from 'chai';

import { CommonDidDocument } from '../../../../../dist/hedera-modules/vcjs/did/common-did-document.js';

describe('CommonDidDocument coverage', function () {
    const did = 'did:example:123456789abcdefghi';
    const vm = {
        id: did + '#keys-1',
        controller: did,
        type: 'Ed25519VerificationKey2018',
        publicKeyBase58: 'pub1'
    };
    const fullDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        alsoKnownAs: ['did:example:alias'],
        controller: [did, 'did:example:other'],
        verificationMethod: [vm],
        authentication: [vm.id],
        assertionMethod: [vm.id],
        keyAgreement: [vm.id],
        capabilityInvocation: [vm.id],
        capabilityDelegation: [vm.id],
        service: [{ id: did + '#svc', type: 'LinkedDomains', serviceEndpoint: 'https://x' }]
    };

    it('parses a non-Hedera DID via CommonDid', function () {
        const doc = CommonDidDocument.from(fullDocument);
        assert.equal(doc.getDid(), did);
    });

    it('keeps alsoKnownAs and array controller', function () {
        const obj = CommonDidDocument.from(fullDocument).getDocument();
        assert.deepEqual(obj.alsoKnownAs, ['did:example:alias']);
        assert.deepEqual(obj.controller, [did, 'did:example:other']);
    });

    it('handles a string controller', function () {
        const obj = CommonDidDocument.from({ ...fullDocument, controller: did }).getDocument();
        assert.equal(obj.controller, did);
    });

    it('maps keyAgreement / capabilityInvocation / capabilityDelegation', function () {
        const obj = CommonDidDocument.from(fullDocument).getDocument();
        assert.deepEqual(obj.keyAgreement, [vm.id]);
        assert.deepEqual(obj.capabilityInvocation, [vm.id]);
        assert.deepEqual(obj.capabilityDelegation, [vm.id]);
    });

    it('round-trips all collection sections through toObject', function () {
        const obj = CommonDidDocument.from(fullDocument).getDocument();
        assert.deepEqual(obj.authentication, [vm.id]);
        assert.deepEqual(obj.assertionMethod, [vm.id]);
        assert.lengthOf(obj.service, 1);
    });

    it('compare returns false when verificationMethod length differs', function () {
        const a = CommonDidDocument.from(fullDocument);
        const twoMethods = {
            ...fullDocument,
            verificationMethod: [vm, { ...vm, id: did + '#keys-2', publicKeyBase58: 'pub2' }]
        };
        const b = CommonDidDocument.from(twoMethods);
        assert.isFalse(a.compare(b));
    });

    it('compare returns false when a method id is missing on the other side', function () {
        const a = CommonDidDocument.from(fullDocument);
        const renamed = {
            ...fullDocument,
            verificationMethod: [{ ...vm, id: did + '#different' }]
        };
        const b = CommonDidDocument.from(renamed);
        assert.isFalse(a.compare(b));
    });

    it('compare accepts a plain IDidDocument object', function () {
        const a = CommonDidDocument.from(fullDocument);
        assert.isTrue(a.compare(a.getDocument()));
    });

    it('serializes embedded verification-method objects (not just string links)', function () {
        const embedded = {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: did,
            verificationMethod: [vm],
            authentication: [vm],
            assertionMethod: [vm],
            keyAgreement: [vm],
            capabilityInvocation: [vm],
            capabilityDelegation: [vm]
        };
        const obj = CommonDidDocument.from(embedded).getDocument();
        assert.equal(obj.authentication[0].id, vm.id);
        assert.equal(obj.assertionMethod[0].id, vm.id);
        assert.equal(obj.keyAgreement[0].id, vm.id);
        assert.equal(obj.capabilityInvocation[0].id, vm.id);
        assert.equal(obj.capabilityDelegation[0].id, vm.id);
    });

    it('compare returns false when a method comparison fails (different key)', function () {
        const a = CommonDidDocument.from(fullDocument);
        const changedKey = {
            ...fullDocument,
            verificationMethod: [{ ...vm, publicKeyBase58: 'differentKey' }]
        };
        const b = CommonDidDocument.from(changedKey);
        assert.isFalse(a.compare(b));
    });
});
