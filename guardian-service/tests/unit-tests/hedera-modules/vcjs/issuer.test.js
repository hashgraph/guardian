const { expect, assert } = require('chai');

const {
    Issuer
} = require('../../../../dist/hedera-modules/vcjs/issuer');

describe('Issuer', function () {
    const rootObj = {
        id: "testId",
        name: "testName"
    };

    it('Test Issuer', async function () {
        const testIssuer =  new Issuer(rootObj.id, rootObj.name);
        assert.equal(testIssuer.getId(), rootObj.id);
        assert.equal(testIssuer.getName(), rootObj.name);

        assert.throws(Issuer.fromJson);
        assert.throws(Issuer.fromJsonTree);
        
        const issuer = Issuer.fromJsonTree(rootObj);
        assert.equal(issuer.getId(), rootObj.id);
        assert.equal(issuer.getName(), rootObj.name);
        assert.deepEqual(issuer.toJsonTree(), rootObj);
        
        const rootJSON = JSON.stringify(rootObj);
        assert.equal(issuer.toJSON(), rootJSON);
        assert.deepEqual(Issuer.fromJson(rootJSON), issuer);
    });
});