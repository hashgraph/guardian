import { assert } from 'chai';

import { timeout } from '../../../dist/hedera-modules/utils.js';

describe('HederaUtils', function () {

    it('Test Utils', async function () {
        assert.isFunction(timeout);
        await timeout(12);
    });

});
