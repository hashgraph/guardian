import { assert } from 'chai';

import { VcDocument } from '../../../../dist/hedera-modules/vcjs/vc-document.js';
import { VcSubject } from '../../../../dist/hedera-modules/vcjs/vc-subject.js';
import { Issuer } from '../../../../dist/hedera-modules/vcjs/issuer.js';

describe('VcDocument extra branches', function () {
    it('default constructor uses Ed25519 context', function () {
        const vc = new VcDocument();
        assert.deepEqual(vc.getContext(), [VcDocument.FIRST_CONTEXT_ENTRY]);
        assert.equal(vc.getSignatureType(), 'Ed25519Signature2018');
    });

    it('constructor with boolean true uses BBS context', function () {
        const vc = new VcDocument(true);
        assert.deepEqual(vc.getContext(), [
            VcDocument.FIRST_CONTEXT_ENTRY,
            VcDocument.BBS_SIGNATURE_CONTEXT
        ]);
        assert.equal(vc.getSignatureType(), 'BbsBlsSignature2020');
    });

    it('constructor with BBS signature-type string uses BBS context', function () {
        const vc = new VcDocument('BbsBlsSignature2020');
        assert.equal(vc.getSignatureType(), 'BbsBlsSignature2020');
    });

    it('constructor with unrelated string falls back to Ed25519', function () {
        const vc = new VcDocument('something-else');
        assert.equal(vc.getSignatureType(), 'Ed25519Signature2018');
    });

    it('setId converts bare uuid to urn form', function () {
        const vc = new VcDocument();
        vc.setId('abc-123');
        assert.equal(vc.getId(), 'urn:uuid:abc-123');
    });

    it('setId keeps already-prefixed ids unchanged', function () {
        const vc = new VcDocument();
        vc.setId('urn:uuid:already');
        assert.equal(vc.getId(), 'urn:uuid:already');
    });

    it('setId with falsy value stores as-is', function () {
        const vc = new VcDocument();
        vc.setId('');
        assert.equal(vc.getId(), '');
    });

    it('getIssuerDid returns null when no issuer set', function () {
        const vc = new VcDocument();
        assert.isNull(vc.getIssuerDid());
    });

    it('setIssuer with string builds an Issuer', function () {
        const vc = new VcDocument();
        vc.setIssuer('did:hedera:1');
        assert.instanceOf(vc.getIssuer(), Issuer);
        assert.equal(vc.getIssuerDid(), 'did:hedera:1');
    });

    it('setIssuer with Issuer instance keeps reference', function () {
        const vc = new VcDocument();
        const issuer = new Issuer('did:hedera:2');
        vc.setIssuer(issuer);
        assert.strictEqual(vc.getIssuer(), issuer);
    });

    it('setIssuer with object exposing getDid builds issuer from did', function () {
        const vc = new VcDocument();
        vc.setIssuer({ getDid: () => 'did:hedera:3' });
        assert.equal(vc.getIssuerDid(), 'did:hedera:3');
    });

    it('getInitId returns null when unset and value when set', function () {
        const vc = new VcDocument();
        assert.isNull(vc.getInitId());
        vc.setInitId('init-1');
        assert.equal(vc.getInitId(), 'init-1');
    });

    it('addContext ignores duplicates and falsy values', function () {
        const vc = new VcDocument();
        vc.addContext('x');
        vc.addContext('x');
        vc.addContext('');
        vc.addContext(null);
        assert.deepEqual(vc.getContext(), [VcDocument.FIRST_CONTEXT_ENTRY, 'x']);
    });

    it('addContexts handles array and single string', function () {
        const vc = new VcDocument();
        vc.addContexts(['a', 'b']);
        vc.addContexts('c');
        assert.deepEqual(vc.getContext(), [VcDocument.FIRST_CONTEXT_ENTRY, 'a', 'b', 'c']);
    });

    it('addType ignores duplicates', function () {
        const vc = new VcDocument();
        vc.addType('T');
        vc.addType('T');
        assert.deepEqual(vc.getType(), [VcDocument.VERIFIABLE_CREDENTIAL_TYPE, 'T']);
    });

    it('addEvidence accumulates evidences in toJsonTree', function () {
        const vc = new VcDocument();
        vc.addEvidence({ a: 1 });
        vc.setIssuer('did:1');
        const tree = vc.toJsonTree();
        assert.deepEqual(tree.evidence, [{ a: 1 }]);
    });

    it('toJsonTree omits evidence when empty', function () {
        const vc = new VcDocument();
        const tree = vc.toJsonTree();
        assert.notProperty(tree, 'evidence');
    });

    it('getCredentialSubject returns undefined for empty subject', function () {
        const vc = new VcDocument();
        assert.isUndefined(vc.getCredentialSubject());
        assert.isUndefined(vc.getSubjectType());
        assert.isUndefined(vc.getField('any'));
    });

    it('addCredentialSubject ignores falsy and increments length', function () {
        const vc = new VcDocument();
        vc.addCredentialSubject(null);
        assert.equal(vc.length, 0);
        vc.addCredentialSubject(VcSubject.create({ type: 'A', value: 5 }));
        assert.equal(vc.length, 1);
        assert.equal(vc.getSubjectType(), 'A');
        assert.equal(vc.getField('value'), 5);
    });

    it('addCredentialSubjects ignores undefined input', function () {
        const vc = new VcDocument();
        vc.addCredentialSubjects(undefined);
        assert.equal(vc.length, 0);
    });

    it('getProof/setProof round trips', function () {
        const vc = new VcDocument();
        assert.isUndefined(vc.getProof());
        vc.setProof({ p: 1 });
        assert.deepEqual(vc.getProof(), { p: 1 });
    });

    it('proofFromJson extracts proof from a tree', function () {
        const vc = new VcDocument();
        vc.proofFromJson({ proof: { sig: 'z' } });
        assert.deepEqual(vc.getProof(), { sig: 'z' });
    });

    it('getTags/setTags round trips', function () {
        const vc = new VcDocument();
        assert.isUndefined(vc.getTags());
        vc.setTags([{ messageId: '1' }]);
        assert.deepEqual(vc.getTags(), [{ messageId: '1' }]);
    });

    it('addTags ignores empty/null input', function () {
        const vc = new VcDocument();
        vc.addTags(null);
        vc.addTags([]);
        assert.isUndefined(vc.getTags());
    });

    it('addTags only keeps inheritTags entries and dedupes by messageId', function () {
        const vc = new VcDocument();
        vc.addTags([
            { messageId: 'a', inheritTags: true },
            { messageId: 'b', inheritTags: false },
            { messageId: 'a', inheritTags: true }
        ]);
        assert.deepEqual(vc.getTags(), [{ messageId: 'a', inheritTags: true }]);
    });

    it('toJsonTree includes tags when present', function () {
        const vc = new VcDocument();
        vc.setTags([{ messageId: 'x' }]);
        assert.deepEqual(vc.toJsonTree().tags, [{ messageId: 'x' }]);
    });

    it('static toCredentialHash returns null for falsy input', function () {
        assert.isNull(VcDocument.toCredentialHash(null));
    });

    it('static toCredentialHash hashes a single document', function () {
        const vc = new VcDocument();
        vc.setIssuer('did:1');
        vc.addCredentialSubject(VcSubject.create({ type: 'A', v: 1 }));
        const hash = VcDocument.toCredentialHash(vc);
        assert.isString(hash);
        assert.isAbove(hash.length, 0);
    });

    it('static toCredentialHash hashes an array of documents', function () {
        const vc1 = new VcDocument();
        vc1.setIssuer('did:1');
        vc1.addCredentialSubject(VcSubject.create({ type: 'A', v: 1 }));
        const vc2 = new VcDocument();
        vc2.setIssuer('did:2');
        vc2.addCredentialSubject(VcSubject.create({ type: 'B', v: 2 }));
        const hash = VcDocument.toCredentialHash([vc1, vc2]);
        assert.isString(hash);
    });

    it('toStaticObject collapses to issuer + subjects', function () {
        const vc = new VcDocument();
        vc.setIssuer('did:9');
        vc.addCredentialSubject(VcSubject.create({ type: 'A', v: 1 }));
        const obj = vc.toStaticObject();
        assert.equal(obj.issuer, 'did:9');
        assert.isArray(obj.credentialSubject);
        assert.equal(obj.credentialSubject.length, 1);
    });

    it('fromJson throws for invalid JSON', function () {
        assert.throws(() => VcDocument.fromJson('{not-json'), /not a valid VcDocument/);
    });

    it('fromJsonTree throws for empty input', function () {
        assert.throws(() => VcDocument.fromJsonTree(null), /JSON Object is empty/);
    });

    it('fromJsonTree builds with single (non-array) credentialSubject', function () {
        const tree = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: 'urn:uuid:1',
            type: ['VerifiableCredential'],
            credentialSubject: { type: 'A', v: 1 }
        };
        const vc = VcDocument.fromJsonTree(tree);
        assert.equal(vc.length, 1);
        assert.deepEqual(vc.getContext(), ['https://www.w3.org/2018/credentials/v1']);
    });

    it('fromJsonTree wraps a single evidence object into an array', function () {
        const tree = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential'],
            credentialSubject: [],
            evidence: { e: 1 }
        };
        const vc = VcDocument.fromJsonTree(tree);
        assert.deepEqual(vc.toJsonTree().evidence, [{ e: 1 }]);
    });
});
