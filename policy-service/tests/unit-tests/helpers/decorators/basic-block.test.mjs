import 'module-alias/register.js';

import { assert } from 'chai';

import { BasicBlock } from '../../../../dist/policy-engine/helpers/decorators/basic-block.js';

describe('Basic Block', function() {
    it('Create', async function() {
        const fn  = BasicBlock({blockType: 'basicBlock', children: []});
        const result = new fn(function () {});
        assert(result.blockType, 'basicBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);

    })
})
