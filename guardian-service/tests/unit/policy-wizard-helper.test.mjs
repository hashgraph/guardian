import { assert } from 'chai';
import { PolicyWizardHelper } from '../../dist/api/helpers/policy-wizard-helper.js';

describe('PolicyWizardHelper', () => {
    it('generateBlockTag increments counter and follows {role}_{blockType}_{n} shape', () => {
        const h = new PolicyWizardHelper();
        const a = h.generateBlockTag('USER', 'requestVcDocumentBlock');
        const b = h.generateBlockTag('USER', 'requestVcDocumentBlock');
        const c = h.generateBlockTag('SR', 'sendToGuardianBlock');
        assert.equal(a, 'USER_requestVcDocumentBlock_1');
        assert.equal(b, 'USER_requestVcDocumentBlock_2');
        assert.equal(c, 'SR_sendToGuardianBlock_3');
    });

    it('createPolicyConfig returns an interfaceContainerBlock root with a UUID id and ANY_ROLE permission', () => {
        const h = new PolicyWizardHelper();
        const root = h.createPolicyConfig({ roles: ['SR'], schemas: [], trustChain: [] });
        assert.equal(root.blockType, 'interfaceContainerBlock');
        assert.match(root.id, /^[0-9a-f-]{36}$/);
        assert.deepEqual(root.permissions, ['ANY_ROLE']);
        assert.isArray(root.children);
    });

    it('resets the block counter at the start of each createPolicyConfig call', () => {
        const h = new PolicyWizardHelper();
        h.createPolicyConfig({ roles: ['USER'], schemas: [], trustChain: [] });
        const counterBefore = h.blockCounter;
        h.createPolicyConfig({ roles: ['USER'], schemas: [], trustChain: [] });
        // After reset, counter should not be greater than the first call's final value
        // (it gets reset to 0 then incremented for the same set of blocks)
        assert.equal(h.blockCounter, counterBefore);
    });

    it('always emits a choose-role block as the first child of root', () => {
        const h = new PolicyWizardHelper();
        const root = h.createPolicyConfig({ roles: ['SR', 'USER'], schemas: [], trustChain: [] });
        assert.isAbove(root.children.length, 0);
        // First child must be the policyRolesBlock (choose-role)
        const first = root.children[0];
        assert.equal(first.blockType, 'policyRolesBlock');
        assert.deepEqual(first.roles, ['SR', 'USER']);
    });

    it('appends one role-container child per declared role', () => {
        const h = new PolicyWizardHelper();
        const root = h.createPolicyConfig({ roles: ['SR', 'USER', 'AUDITOR'], schemas: [], trustChain: [] });
        // root.children = [chooseRole, ...roleContainers]
        const containers = root.children.slice(1);
        assert.equal(containers.length, 3);
        for (const c of containers) {
            assert.equal(c.blockType, 'interfaceContainerBlock');
        }
    });
});
