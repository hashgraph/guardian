require('module-alias/register');
const rewire = require("rewire");

const {Inject} = rewire('../../../dist/helpers/decorators/inject');

const { BlockTreeGenerator } = require("../../../dist/policy-engine/block-tree-generator");

describe('BlockTreeGenerator', function () {
    it('Create', async function () {
        const generator = new BlockTreeGenerator();
        console.log(generator);
    });
})
