require('module-alias/register');
const rewire = require("rewire");

const {Inject} = rewire('../../dist/helpers/decorators/inject');
const {PolicyComponentsUtils} = require("../../dist/policy-engine/policy-components-utils");
const {assert} = require('chai');

describe('State Container', function () {
    it('GenerateNewUUID', async function () {
        assert.equal(PolicyComponentsUtils.GenerateNewUUID().length, 36)
    });

    it('IfUUIDRegistered', async function () {
        assert.equal(PolicyComponentsUtils.IfUUIDRegistered(new Array(36).fill('0').join('')), false);
        const uuid = PolicyComponentsUtils.GenerateNewUUID();
        PolicyComponentsUtils.PolicyBlockMapObject.set(uuid, {});
        assert.equal(PolicyComponentsUtils.IfUUIDRegistered(uuid), true);

    });
})
