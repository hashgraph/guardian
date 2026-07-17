import { assert } from 'chai';

import { VcDocument } from '../../../../dist/hedera-modules/vcjs/vc-document.js';
import { VcSubject } from '../../../../dist/hedera-modules/vcjs/vc-subject.js';
import { Issuer } from '../../../../dist/hedera-modules/vcjs/issuer.js';

import { vc_document } from '../../dump/vc_document.mjs';

function cloneDoc(index) {
    return JSON.parse(JSON.stringify(vc_document[index].document));
}

function expectedDoc(index) {
    const doc = cloneDoc(index);
    if (doc.id) {
        doc.id = VcDocument.convertUUID(doc.id);
    }
    if (Array.isArray(doc.credentialSubject)) {
        for (const cs of doc.credentialSubject) {
            if (cs && cs.id) {
                cs.id = VcSubject.convertUUID(cs.id);
            }
        }
    }
    return doc;
}

describe('VcDocument fixtures round-trip', function () {
    for (let i = 0; i < vc_document.length; i++) {
        const doc = expectedDoc(i);

        it(`fixture ${i}: fromJsonTree -> toJsonTree is stable`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.deepEqual(vc.toJsonTree(), doc);
        });

        it(`fixture ${i}: toJson parses back to the original tree`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.deepEqual(JSON.parse(vc.toJson()), doc);
        });

        it(`fixture ${i}: fromJson string matches fromJsonTree`, function () {
            const vc = VcDocument.fromJson(JSON.stringify(cloneDoc(i)));
            assert.deepEqual(vc.toJsonTree(), doc);
        });

        it(`fixture ${i}: getId converts to urn form when no scheme`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.equal(vc.getId(), VcDocument.convertUUID(doc.id));
        });

        it(`fixture ${i}: getContext equals document context`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.deepEqual(vc.getContext(), doc['@context']);
        });

        it(`fixture ${i}: getType equals document type`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.deepEqual(vc.getType(), doc.type);
        });

        it(`fixture ${i}: getIssuer reconstructs Issuer`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.instanceOf(vc.getIssuer(), Issuer);
            assert.equal(vc.getIssuerDid(), doc.issuer);
        });

        it(`fixture ${i}: getProof equals document proof`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.deepEqual(vc.getProof(), doc.proof);
        });

        it(`fixture ${i}: subject count matches credentialSubject length`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.equal(vc.length, doc.credentialSubject.length);
        });

        it(`fixture ${i}: getCredentialSubject(0) is a VcSubject`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.instanceOf(vc.getCredentialSubject(0), VcSubject);
        });

        it(`fixture ${i}: getSubjectType matches first subject type`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.equal(vc.getSubjectType(), doc.credentialSubject[0].type);
        });

        it(`fixture ${i}: getCredentialSubjects returns all subjects`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.lengthOf(vc.getCredentialSubjects(), doc.credentialSubject.length);
        });

        it(`fixture ${i}: toCredentialHash is a deterministic base58 string`, function () {
            const a = VcDocument.fromJsonTree(cloneDoc(i)).toCredentialHash();
            const b = VcDocument.fromJsonTree(cloneDoc(i)).toCredentialHash();
            assert.isString(a);
            assert.equal(a, b);
            assert.match(a, /^[1-9A-HJ-NP-Za-km-z]+$/);
        });

        it(`fixture ${i}: getDocument equals toJsonTree`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.deepEqual(vc.getDocument(), vc.toJsonTree());
        });

        it(`fixture ${i}: getSignatureType is Ed25519 (non-BBS context)`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.equal(vc.getSignatureType(), 'Ed25519Signature2018');
        });

        it(`fixture ${i}: getIssuanceDate round-trips to the same epoch`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.equal(
                vc.getIssuanceDate().toDate().getTime(),
                new Date(doc.issuanceDate).getTime()
            );
        });

        it(`fixture ${i}: static toCredentialHash(single) is a string`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            assert.isString(VcDocument.toCredentialHash(vc));
        });

        it(`fixture ${i}: toStaticObject exposes issuer + credentialSubject`, function () {
            const vc = VcDocument.fromJsonTree(cloneDoc(i));
            const obj = vc.toStaticObject();
            assert.equal(obj.issuer, doc.issuer);
            assert.lengthOf(obj.credentialSubject, doc.credentialSubject.length);
        });
    }

    it('static toCredentialHash over an array of all fixtures is stable', function () {
        const docs = vc_document.map((e) => VcDocument.fromJsonTree(JSON.parse(JSON.stringify(e.document))));
        const a = VcDocument.toCredentialHash(docs);
        const docs2 = vc_document.map((e) => VcDocument.fromJsonTree(JSON.parse(JSON.stringify(e.document))));
        const b = VcDocument.toCredentialHash(docs2);
        assert.isString(a);
        assert.equal(a, b);
    });

    it('different fixtures produce different credential hashes', function () {
        const h0 = VcDocument.fromJsonTree(cloneDoc(0)).toCredentialHash();
        const h1 = VcDocument.fromJsonTree(cloneDoc(1)).toCredentialHash();
        assert.notEqual(h0, h1);
    });
});
