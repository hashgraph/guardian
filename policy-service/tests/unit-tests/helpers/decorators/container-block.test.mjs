import 'module-alias/register.js';

import { assert } from 'chai';

import { ContainerBlock} from '../../../../dist/policy-engine/helpers/decorators/container-block.js';

describe('Container Block', function() {
    it('Create', async function() {
        const fn  = ContainerBlock({blockType: 'testBlock', children: []});
        const result = new fn(function () {});
        assert(result.blockType, 'testBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);
    })
})
