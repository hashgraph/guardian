const { expect, assert } = require('chai');

const {
    Issuer
} = require('../../../../dist/hedera-modules/vcjs/issuer');

describe('Issuer', function () {
    const rootObj = {
        id: "testId",
        group: "testGroup"
    };

    it('Test Issuer', async function () {
        const testIssuer =  new Issuer(rootObj.id, rootObj.group);
        assert.equal(testIssuer.getId(), rootObj.id);
        assert.equal(testIssuer.getGroup(), rootObj.group);

        assert.throws(Issuer.fromJson);
        assert.throws(Issuer.fromJsonTree);

        const issuer = Issuer.fromJsonTree(rootObj);
        assert.equal(issuer.getId(), rootObj.id);
        assert.equal(issuer.getGroup(), rootObj.group);
        assert.deepEqual(issuer.toJsonTree(), rootObj);

        const rootJSON = JSON.stringify(rootObj);
        assert.equal(issuer.toJSON(), rootJSON);
        assert.deepEqual(Issuer.fromJson(rootJSON), issuer);
    });
});