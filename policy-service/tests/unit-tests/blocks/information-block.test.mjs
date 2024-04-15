import { assert } from 'chai';
import moduleAlias from 'module-alias';
import dotenv from 'dotenv';

dotenv.config();

moduleAlias.addAliases({
    '@api': `${process.cwd()}/dist/api`,
    '@entity': `${process.cwd()}/dist/entity`,
    '@subscribers': `${process.cwd()}/dist/subscribers`,
    '@helpers': `${process.cwd()}/dist/helpers`,
    '@auth': `${process.cwd()}/dist/auth`,
    '@policy-engine': `${process.cwd()}/dist/policy-engine`,
    '@hedera-modules': `${process.cwd()}/dist/hedera-modules/index`,
    '@document-loader': `${process.cwd()}/dist/document-loader`,
    '@database-modules': `${process.cwd()}/dist/database-modules`,
});

describe('Information block', function() {
    it('init', async function () {
    })

    it('getData', async function() {
    })
})
