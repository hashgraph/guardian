const moduleAlias = require('module-alias');
const rewire = require("rewire");

moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' + "/entity",
  "@subscribers": process.cwd() + '/dist' + "dist/subscribers",
  "@helpers": process.cwd() + '/dist' + "/helpers",
  "@auth": process.cwd() + '/dist' + "/auth",
  "@policy-engine": process.cwd() + '/dist' + "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' + "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' + "/document-loader"
});

const {Inject} = rewire('../../../dist/helpers/decorators/inject');

const { BlockTreeGenerator } = require("../../../dist/policy-engine/block-tree-generator");

describe('BlockTreeGenerator', function () {
    it('Create', async function () {
        const generator = new BlockTreeGenerator();
        console.log(generator);
    });
})
