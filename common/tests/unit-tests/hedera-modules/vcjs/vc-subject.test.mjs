import { assert } from 'chai';

import { VcSubject } from '../../../../dist/hedera-modules/vcjs/vc-subject.js';

import { vc_document } from '../../dump/vc_document.mjs';

describe('VcSubject', function () {
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
