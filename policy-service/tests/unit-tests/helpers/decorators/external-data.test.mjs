import 'module-alias/register.js';

import { assert } from 'chai';

import { ExternalData } from '../../../../dist/policy-engine/helpers/decorators/external-data.js';

describe('ExternalData Block', function() {
    it('Create', async function() {
        const fn  = ExternalData({blockType: 'testBlock', children: []});
        const result = new fn(function () {});
        assert(result.blockType, 'testBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);
    })
})
