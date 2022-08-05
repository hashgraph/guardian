const moduleAlias = require('module-alias');

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

const {assert} = require('chai');

describe('Information block', function() {
    it('init', async function () {
    })

    it('getData', async function() {
    })
})
