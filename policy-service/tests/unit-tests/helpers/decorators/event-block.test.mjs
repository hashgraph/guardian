import 'module-alias/register.js';

import { assert } from 'chai';

import { EventBlock } from '../../../../dist/policy-engine/helpers/decorators/event-block.js';

describe('Event Block', function() {
    it('Create', async function() {
        const fn  = EventBlock({blockType: 'testBlock', children: []});
        const result = new fn(function () {});
        assert(result.blockType, 'testBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);
    })
})
