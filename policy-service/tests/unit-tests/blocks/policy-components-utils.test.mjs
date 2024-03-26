import { assert } from 'chai';
import moduleAlias from 'module-alias';
import rewire from 'rewire';

import { GenerateUUIDv4 } from '@guardian/interfaces';
import * as common from '@guardian/common';

import { Inject } from '../../../dist/helpers/decorators/inject.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const { GenerateNewUUID } = common;

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

describe('State Container', function () {
    it('GenerateNewUUID', async function () {
        assert.equal(GenerateUUIDv4().length, 36)
    });

    // it('IfUUIDRegistered', async function () {
    //     assert.equal(PolicyComponentsUtils.IfUUIDRegistered(new Array(36).fill('0').join('')), false);
    //     const uuid = GenerateUUIDv4();
    //     PolicyComponentsUtils.PolicyBlockMapObject.set(uuid, {});
    //     assert.equal(PolicyComponentsUtils.IfUUIDRegistered(uuid), true);
    //
    // });
})
