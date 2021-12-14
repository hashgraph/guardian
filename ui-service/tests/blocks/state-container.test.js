require('module-alias/register');
const {StateContainer} = require("../../dist/policy-engine/state-container");
const {assert} = require('chai');

describe('State Container', function () {
    it('GenerateNewUUID', async function () {
        const block = new StateContainer();
        assert.equal(StateContainer.GenerateNewUUID().length, 36)
    });

    it('IfUUIDRegistered', async function () {
        assert.equal(StateContainer.IfUUIDRegistered(new Array(36).fill('0').join('')), false);
        const uuid = StateContainer.GenerateNewUUID();
        StateContainer.PolicyBlockMapObject.set(uuid, {});
        assert.equal(StateContainer.IfUUIDRegistered(uuid), true);

    });
})
