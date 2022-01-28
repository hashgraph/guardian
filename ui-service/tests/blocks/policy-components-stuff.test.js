require('module-alias/register');
const rewire = require("rewire");

const {Inject} = rewire('../../dist/helpers/decorators/inject');
const {PolicyComponentsStuff} = require("../../dist/policy-engine/policy-components-stuff");
const {assert} = require('chai');

describe('State Container', function () {
    it('GenerateNewUUID', async function () {
        assert.equal(PolicyComponentsStuff.GenerateNewUUID().length, 36)
    });

    it('IfUUIDRegistered', async function () {
        assert.equal(PolicyComponentsStuff.IfUUIDRegistered(new Array(36).fill('0').join('')), false);
        const uuid = PolicyComponentsStuff.GenerateNewUUID();
        PolicyComponentsStuff.PolicyBlockMapObject.set(uuid, {});
        assert.equal(PolicyComponentsStuff.IfUUIDRegistered(uuid), true);

    });
})
