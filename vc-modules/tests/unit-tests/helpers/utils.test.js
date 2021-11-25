const {
    HederaUtils
} = require("../../../dist/index");
const { expect, assert } = require('chai');

describe("HederaUtils", function () {

    it('Test Utils', async function () {
        const uuid = HederaUtils.randomUUID();
        assert.exists(uuid);

        const key = HederaUtils.randomKey();
        assert.exists(key);

        const message = HederaUtils.encode(HederaUtils.decode("Test Message"));
        assert.equal(message, "Test Message");
    });

});