const { expect, assert } = require('chai');

const {
    VcSubject
} = require('../../../../dist/hedera-modules/vcjs/vc-subject');
const { vc_document } = require('../../dump/vc_document');

describe.skip('VcSubject', function () {
    const testCS = vc_document[0].document.credentialSubject[0];

    it('Test VcSubject', async function () {
        assert.throws(VcSubject.fromJsonTree);
        assert.throws(VcSubject.create);

        const vcSubject = VcSubject.fromJsonTree(testCS);
        assert.equal(vcSubject.getId(), testCS.id);
        assert.equal(vcSubject.getType(), testCS.type);
        assert.equal(vcSubject.getField("name"), testCS.name);

        const testContext = "testContext";
        vcSubject.addContext(testContext);
        testCS['@context'].push(testContext);
        assert.deepEqual(vcSubject.toJsonTree(), testCS);

        assert.deepEqual(JSON.parse(VcSubject.fromJson(JSON.stringify(testCS)).toJson()), testCS);

        assert.deepEqual(VcSubject.create(testCS).toJsonTree(), testCS);
    });
});
