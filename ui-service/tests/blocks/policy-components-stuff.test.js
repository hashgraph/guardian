require('module-alias/register');
const {PolicyComponentsStuff} = require("../../dist/policy-engine/policy-components-stuff");
const {assert} = require('chai');

describe('State Container', function () {
    it('GenerateNewUUID', async function () {
        assert.equal(StateContainer.GenerateNewUUID().length, 36)
    });

    it('IfUUIDRegistered', async function () {
        assert.equal(PolicyComponentsStuff.IfUUIDRegistered(new Array(36).fill('0').join('')), false);
        const uuid = PolicyComponentsStuff.GenerateNewUUID();
        PolicyComponentsStuff.PolicyBlockMapObject.set(uuid, {});
        assert.equal(PolicyComponentsStuff.IfUUIDRegistered(uuid), true);

    });
})
