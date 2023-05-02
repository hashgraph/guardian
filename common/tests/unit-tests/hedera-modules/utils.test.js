const {
    timeout
} = require('../../../dist/hedera-modules/utils');
const { expect, assert } = require('chai');

describe('HederaUtils', function () {

    it('Test Utils', async function () {
        assert.isFunction(timeout);
        await timeout(12);
    });

});
