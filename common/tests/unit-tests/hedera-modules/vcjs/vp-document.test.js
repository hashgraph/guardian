const { expect, assert } = require('chai');

const {
    VpDocument
} = require('../../../../dist/hedera-modules/vcjs/vp-document');
const {
    VcDocument
} = require('../../../../dist/hedera-modules/vcjs/vc-document');
const { vp_document } = require('../../dump/vp_document');

describe('VpDocument', function () {

    const testId = "urn:uuid:testId";
    const testType = "testType";
    const testContext = "testContext";
    const testVpDocument = vp_document[0].document;
    const testVpDocumentSecond = vp_document[1].document;
    const testVC = testVpDocumentSecond.verifiableCredential[0];
    const testVCs = testVpDocumentSecond.verifiableCredential;
    const testVpDocumentThird = vp_document[2].document;

    it('Test VpDocument', async function () {
        assert.throws(VpDocument.fromJsonTree);
        assert.throws(VpDocument.fromJson);
        const vpDocument = VpDocument.fromJsonTree(testVpDocument);
        assert.equal(vpDocument.getId(), testVpDocument.id);
        assert.deepEqual(vpDocument.getContext(), testVpDocument['@context']);
        assert.deepEqual(vpDocument.getType(), testVpDocument.type);
        assert.deepEqual(vpDocument.getProof(), testVpDocument.proof);
        assert.deepEqual(vpDocument.getVerifiableCredential(0), VcDocument.fromJsonTree(testVpDocument.verifiableCredential[0]));
        assert.deepEqual(vpDocument.getVerifiableCredentials(), testVpDocument.verifiableCredential.map(vc => VcDocument.fromJsonTree(vc)));
        assert.equal(vpDocument.length, testVpDocument.verifiableCredential.length);
        assert.isString(vpDocument.toCredentialHash());
        assert.deepEqual(vpDocument.toJsonTree(), testVpDocument);
        assert.deepEqual(vpDocument.getDocument(), testVpDocument);
        assert.deepEqual(JSON.parse(vpDocument.toJson()), testVpDocument);

        testVpDocument.id = testId;
        vpDocument.setId(testId);
        assert.equal(vpDocument.getId(), testVpDocument.id);

        testVpDocument['@context'].push(testContext);
        vpDocument.addContext(testContext);
        assert.deepEqual(vpDocument.getContext(), testVpDocument['@context']);

        testVpDocument.type.push(testType);
        vpDocument.addType(testType);
        assert.deepEqual(vpDocument.getType(), testVpDocument.type);

        testVpDocument.proof = vp_document[1].document.proof;
        vpDocument.setProof(testVpDocument.proof);
        assert.deepEqual(vpDocument.getProof(), testVpDocument.proof);

        testVpDocument.verifiableCredential.push(testVC);
        vpDocument.addVerifiableCredential(VcDocument.fromJsonTree(testVC));
        testVpDocument.verifiableCredential.push(...testVCs);
        vpDocument.addVerifiableCredentials(testVCs.map((testVC) => VcDocument.fromJsonTree(testVC)));
        assert.deepEqual(vpDocument.toJsonTree(), testVpDocument);

        vpDocument.proofFromJson(testVpDocumentThird);
        assert.deepEqual(vpDocument.getProof(), testVpDocumentThird.proof);
    });
});