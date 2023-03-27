const { expect, assert } = require('chai');

const {
    VcDocument
} = require('../../../../dist/hedera-modules/vcjs/vc-document');
const {
    VcSubject
} = require('../../../../dist/hedera-modules/vcjs/vc-subject');
const { vc_document } = require('../../dump/vc_document');
const {
    Issuer
} = require('../../../../dist/hedera-modules/vcjs/issuer');

describe.skip('VcDocument', function () {

    const testVcDocument = vc_document[0].document;
    const testType = "testType";
    const testContext = "testContext";
    const testVcDocumentSecond = vc_document[1].document;
    const testCS = testVcDocumentSecond.credentialSubject[0];
    const testCSs = testVcDocumentSecond.credentialSubject;
    const testIssuerSecond = testVcDocumentSecond.issuer;

    it('Test VcDocument', async function () {
        const emptyVc = new VcDocument();
        assert.deepEqual(emptyVc.getContext(), [VcDocument.FIRST_CONTEXT_ENTRY]);
        assert.deepEqual(emptyVc.getType(), [VcDocument.VERIFIABLE_CREDENTIAL_TYPE]);

        assert.throws(VcDocument.fromJsonTree);
        assert.throws(VcDocument.fromJson);

        const testIssuer = new Issuer(testVcDocument.issuer);
        const vcDocument = VcDocument.fromJsonTree(testVcDocument);
        assert.equal(vcDocument.getId(), testVcDocument.id);
        assert.deepEqual(vcDocument.getContext(), testVcDocument['@context']);
        assert.deepEqual(vcDocument.getIssuer(), testIssuer);
        assert.deepEqual(vcDocument.getIssuerDid(), testIssuer.getId());
        assert.deepEqual(vcDocument.getIssuanceDate().toDate().getTime(), new Date(testVcDocument.issuanceDate).getTime());
        assert.equal(vcDocument.getSubjectType(), testVcDocument.credentialSubject[0].type);
        assert.equal(vcDocument.length, testVcDocument.credentialSubject.length);
        assert.isString(vcDocument.toCredentialHash());
        assert.exists(vcDocument);
        assert.deepEqual(vcDocument.toJsonTree(), testVcDocument);
        assert.deepEqual(vcDocument.getDocument(), testVcDocument);
        assert.deepEqual(JSON.parse(vcDocument.toJson()), testVcDocument);

        testVcDocument.issuer = testIssuerSecond;
        vcDocument.setIssuer(Issuer.fromJsonTree(testIssuerSecond));
        assert.deepEqual(vcDocument.getIssuer(), Issuer.fromJsonTree(testIssuer));

        testVcDocument['@context'].push(testContext);
        vcDocument.addContext(testContext);
        assert.deepEqual(vcDocument.getContext(), testVcDocument['@context']);

        testVcDocument.type.push(testType);
        vcDocument.addType(testType);
        assert.deepEqual(vcDocument.getType(), testVcDocument.type);

        testVcDocument.proof = vc_document[1].document.proof;
        vcDocument.setProof(testVcDocument.proof);
        assert.deepEqual(vcDocument.getProof(), testVcDocument.proof);

        testVcDocument.credentialSubject.push(testCS);
        vcDocument.addCredentialSubject(VcSubject.fromJsonTree(testCS));
        testVcDocument.credentialSubject.push(...testCSs);
        vcDocument.addCredentialSubjects(testCSs.map((testCS) => VcSubject.fromJsonTree(testCS)));
        assert.deepEqual(vcDocument.toJsonTree(), testVcDocument);
    });
});
