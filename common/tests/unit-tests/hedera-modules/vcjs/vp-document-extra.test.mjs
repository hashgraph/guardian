import { assert } from 'chai';

import { VpDocument } from '../../../../dist/hedera-modules/vcjs/vp-document.js';
import { VcDocument } from '../../../../dist/hedera-modules/vcjs/vc-document.js';
import { VcSubject } from '../../../../dist/hedera-modules/vcjs/vc-subject.js';
import { Issuer } from '../../../../dist/hedera-modules/vcjs/issuer.js';
import { TimestampUtils } from '../../../../dist/hedera-modules/timestamp-utils.js';

function makeVc(did, subject) {
    const vc = new VcDocument();
    vc.setIssuer(did);
    vc.setIssuanceDate(TimestampUtils.now());
    vc.addCredentialSubject(VcSubject.create(subject));
    return vc;
}

describe('VpDocument extra branches', function () {
    it('default constructor sets type and context', function () {
        const vp = new VpDocument();
        assert.deepEqual(vp.getType(), [VpDocument.VERIFIABLE_PRESENTATION_TYPE]);
        assert.deepEqual(vp.getContext(), [VpDocument.FIRST_CONTEXT_ENTRY]);
        assert.equal(vp.length, 0);
    });

    it('setId converts bare uuid to urn form', function () {
        const vp = new VpDocument();
        vp.setId('zzz');
        assert.equal(vp.getId(), 'urn:uuid:zzz');
    });

    it('setId keeps prefixed id', function () {
        const vp = new VpDocument();
        vp.setId('did:something');
        assert.equal(vp.getId(), 'did:something');
    });

    it('getIssuerDid returns null with no issuer', function () {
        const vp = new VpDocument();
        assert.isNull(vp.getIssuerDid());
    });

    it('setIssuer with string', function () {
        const vp = new VpDocument();
        vp.setIssuer('did:1');
        assert.instanceOf(vp.getIssuer(), Issuer);
        assert.equal(vp.getIssuerDid(), 'did:1');
    });

    it('setIssuer with Issuer instance', function () {
        const vp = new VpDocument();
        const issuer = new Issuer('did:2');
        vp.setIssuer(issuer);
        assert.strictEqual(vp.getIssuer(), issuer);
    });

    it('setIssuer with getDid object', function () {
        const vp = new VpDocument();
        vp.setIssuer({ getDid: () => 'did:3' });
        assert.equal(vp.getIssuerDid(), 'did:3');
    });

    it('addContext and addType append', function () {
        const vp = new VpDocument();
        vp.addContext('c1');
        vp.addType('t1');
        assert.deepEqual(vp.getContext(), [VpDocument.FIRST_CONTEXT_ENTRY, 'c1']);
        assert.deepEqual(vp.getType(), [VpDocument.VERIFIABLE_PRESENTATION_TYPE, 't1']);
    });

    it('getProof/setProof and proofFromJson', function () {
        const vp = new VpDocument();
        assert.isUndefined(vp.getProof());
        vp.setProof({ a: 1 });
        assert.deepEqual(vp.getProof(), { a: 1 });
        vp.proofFromJson({ proof: { b: 2 } });
        assert.deepEqual(vp.getProof(), { b: 2 });
    });

    it('getTags/setTags round trips', function () {
        const vp = new VpDocument();
        assert.isUndefined(vp.getTags());
        vp.setTags([{ messageId: '1' }]);
        assert.deepEqual(vp.getTags(), [{ messageId: '1' }]);
    });

    it('addTags ignores empty input', function () {
        const vp = new VpDocument();
        vp.addTags(null);
        vp.addTags([]);
        assert.isUndefined(vp.getTags());
    });

    it('addTags filters by inheritTags and dedupes', function () {
        const vp = new VpDocument();
        vp.addTags([
            { messageId: 'a', inheritTags: true },
            { messageId: 'b', inheritTags: false },
            { messageId: 'a', inheritTags: true }
        ]);
        assert.deepEqual(vp.getTags(), [{ messageId: 'a', inheritTags: true }]);
    });

    it('addVerifiableCredential ignores falsy', function () {
        const vp = new VpDocument();
        vp.addVerifiableCredential(null);
        assert.equal(vp.length, 0);
        vp.addVerifiableCredential(makeVc('did:1', { type: 'A', v: 1 }));
        assert.equal(vp.length, 1);
    });

    it('addVerifiableCredentials ignores undefined and adds all', function () {
        const vp = new VpDocument();
        vp.addVerifiableCredentials(undefined);
        assert.equal(vp.length, 0);
        vp.addVerifiableCredentials([
            makeVc('did:1', { type: 'A', v: 1 }),
            makeVc('did:2', { type: 'B', v: 2 })
        ]);
        assert.equal(vp.length, 2);
        assert.instanceOf(vp.getVerifiableCredential(1), VcDocument);
    });

    it('toCredentialHash produces a string', function () {
        const vp = new VpDocument();
        vp.setId('urn:uuid:1');
        vp.addVerifiableCredential(makeVc('did:1', { type: 'A', v: 1 }));
        assert.isString(vp.toCredentialHash());
    });

    it('toJsonTree includes tags when present', function () {
        const vp = new VpDocument();
        vp.setTags([{ messageId: 'x' }]);
        assert.deepEqual(vp.toJsonTree().tags, [{ messageId: 'x' }]);
    });

    it('toJsonTree omits proof when absent', function () {
        const vp = new VpDocument();
        assert.notProperty(vp.toJsonTree(), 'proof');
    });

    it('fromJson throws for invalid JSON', function () {
        assert.throws(() => VpDocument.fromJson('{bad'), /not a valid VpDocument/);
    });

    it('fromJsonTree throws for empty input', function () {
        assert.throws(() => VpDocument.fromJsonTree(null), /JSON Object is empty/);
    });

    it('fromJsonTree handles single (non-array) verifiableCredential', function () {
        const single = makeVc('did:1', { type: 'A', v: 1 }).toJsonTree();
        const tree = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            verifiableCredential: single
        };
        const vp = VpDocument.fromJsonTree(tree);
        assert.equal(vp.length, 1);
    });

    it('fromJsonTree sets proof/tags to null when absent', function () {
        const tree = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            verifiableCredential: []
        };
        const vp = VpDocument.fromJsonTree(tree);
        assert.isNull(vp.getProof());
        assert.isNull(vp.getTags());
    });
});
