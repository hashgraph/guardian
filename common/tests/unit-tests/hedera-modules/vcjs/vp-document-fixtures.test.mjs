import { assert } from 'chai';

import { VpDocument } from '../../../../dist/hedera-modules/vcjs/vp-document.js';
import { VcDocument } from '../../../../dist/hedera-modules/vcjs/vc-document.js';
import { Issuer } from '../../../../dist/hedera-modules/vcjs/issuer.js';

import { vc_document } from '../../dump/vc_document.mjs';

function vcTree(index) {
    return JSON.parse(JSON.stringify(vc_document[index].document));
}

function buildVp(indices) {
    const vp = new VpDocument();
    for (const i of indices) {
        vp.addVerifiableCredential(VcDocument.fromJsonTree(vcTree(i)));
    }
    return vp;
}

describe('VpDocument with VC fixtures', function () {
    it('wraps several VC fixtures and reports correct length', function () {
        const vp = buildVp([0, 1, 2]);
        assert.equal(vp.length, 3);
        for (let i = 0; i < 3; i++) {
            assert.instanceOf(vp.getVerifiableCredential(i), VcDocument);
        }
    });

    it('toJsonTree carries type, context and verifiableCredential array', function () {
        const vp = buildVp([0, 1]);
        const tree = vp.toJsonTree();
        assert.deepEqual(tree.type, [VpDocument.VERIFIABLE_PRESENTATION_TYPE]);
        assert.deepEqual(tree['@context'], [VpDocument.FIRST_CONTEXT_ENTRY]);
        assert.lengthOf(tree.verifiableCredential, 2);
    });

    it('toCredentialHash is deterministic for the same VCs', function () {
        const a = buildVp([0, 1, 2]);
        a.setId('urn:uuid:fixed');
        const b = buildVp([0, 1, 2]);
        b.setId('urn:uuid:fixed');
        assert.equal(a.toCredentialHash(), b.toCredentialHash());
    });

    it('toCredentialHash differs when credential set differs', function () {
        const a = buildVp([0, 1]);
        a.setId('urn:uuid:fixed');
        const b = buildVp([2, 3]);
        b.setId('urn:uuid:fixed');
        assert.notEqual(a.toCredentialHash(), b.toCredentialHash());
    });

    it('fromJsonTree rebuilds an array of credentials', function () {
        const vp = buildVp([0, 1, 2]);
        vp.setId('urn:uuid:p1');
        vp.setIssuer('did:hedera:testnet:issuer');
        const tree = vp.toJsonTree();
        const restored = VpDocument.fromJsonTree(tree);
        assert.equal(restored.length, 3);
        assert.equal(restored.getId(), 'urn:uuid:p1');
        assert.instanceOf(restored.getIssuer(), Issuer);
        assert.equal(restored.getIssuerDid(), 'did:hedera:testnet:issuer');
    });

    it('toJson string round-trips through fromJson', function () {
        const vp = buildVp([0, 1]);
        vp.setId('urn:uuid:p2');
        const json = vp.toJson();
        const restored = VpDocument.fromJson(json);
        assert.equal(restored.getId(), 'urn:uuid:p2');
        assert.equal(restored.length, 2);
    });

    it('getDocument equals toJsonTree', function () {
        const vp = buildVp([0]);
        assert.deepEqual(vp.getDocument(), vp.toJsonTree());
    });

    it('getVerifiableCredentials returns the full array', function () {
        const vp = buildVp([0, 1, 2, 3]);
        assert.lengthOf(vp.getVerifiableCredentials(), 4);
    });

    it('issuer with group survives a round-trip', function () {
        const vp = buildVp([0]);
        vp.setIssuer(new Issuer('did:hedera:testnet:g', 'group-a'));
        const restored = VpDocument.fromJsonTree(vp.toJsonTree());
        assert.equal(restored.getIssuer().getId(), 'did:hedera:testnet:g');
        assert.equal(restored.getIssuer().getGroup(), 'group-a');
    });

    for (let i = 0; i < vc_document.length; i++) {
        it(`single VC fixture ${i} wrapped into a VP round-trips length`, function () {
            const vp = buildVp([i]);
            const restored = VpDocument.fromJsonTree(vp.toJsonTree());
            assert.equal(restored.length, 1);
            assert.instanceOf(restored.getVerifiableCredential(0), VcDocument);
        });

        it(`single VC fixture ${i} VP hash is a base58 string`, function () {
            const vp = buildVp([i]);
            const hash = vp.toCredentialHash();
            assert.isString(hash);
            assert.match(hash, /^[1-9A-HJ-NP-Za-km-z]+$/);
        });
    }
});
