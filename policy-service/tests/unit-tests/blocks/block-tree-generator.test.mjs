import moduleAlias from 'module-alias';
import rewire from 'rewire';
import dotenv from 'dotenv';

dotenv.config();

moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' + "/entity",
  "@subscribers": process.cwd() + '/dist' + "dist/subscribers",
  "@helpers": process.cwd() + '/dist' + "/helpers",
  "@auth": process.cwd() + '/dist' + "/auth",
  "@policy-engine": process.cwd() + '/dist' + "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' + "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' + "/document-loader",
  "@database-modules": process.cwd() + '/dist' + "/database-modules"
});

// const { Inject } = rewire(process.cwd() + '/dist' + '/helpers/decorators/inject.js');

//const { BlockTreeGenerator } = require("../../../dist/policy-engine/block-tree-generator");

describe('BlockTreeGenerator', function () {
    it('Create', async function () {
        // const generator = new BlockTreeGenerator();
        // console.log(generator);
    });
})
