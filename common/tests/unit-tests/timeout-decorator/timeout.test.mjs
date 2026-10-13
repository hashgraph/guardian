import { assert } from 'chai';

import { timeout } from '../../../dist/decorators/timeout.js';

describe('Timeout decorator', function () {

    it('Test Utils', async function () {
        assert.isFunction(timeout);
        await timeout(12);
    });

});
