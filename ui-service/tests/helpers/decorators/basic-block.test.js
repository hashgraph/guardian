require('module-alias/register');
const {assert} = require('chai')
const {BasicBlock} = require("../../../dist/policy-engine/helpers/decorators");

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
