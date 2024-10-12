import 'module-alias/register.js';

import { assert } from 'chai';

import { DataSourceBlock} from '../../../../dist/policy-engine/helpers/decorators/data-source-block.js';

describe('DataSource Block', function() {
    it('Create', async function() {
        const fn  = DataSourceBlock({blockType: 'testBlock', children: []});
        const result = new fn(function () {});
        assert(result.blockType, 'testBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);
    })
})
