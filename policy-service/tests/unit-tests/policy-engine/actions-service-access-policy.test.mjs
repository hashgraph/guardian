import { assert } from 'chai';
import esmock from 'esmock';
import { Permissions, PolicyStatus } from '@guardian/interfaces';

const SERVICE = '../../../dist/policy-engine/actions-service.js';
const ORG_UTILS = '../../../dist/policy-engine/helpers/org-utils.js';

/*
 * guardian-service's accessPolicyCode rejects `user.owner !== policy.owner` before
 * it consults an assignment; this gate did not, so the two were asymmetric. A
 * PolicyOrgAssignment row naming a policy that belongs to a different Standard
 * Registry let that organization's members through here.
 */
async function makeService({ assignedEntity = null, orgAssigned = true } = {}) {
    const calls = { orgAssigned: [] };
    const { PolicyActionsService } = await esmock(SERVICE, {
        '@guardian/common': {
            DatabaseServer: { getAssignedEntity: async () => assignedEntity },
        },
        [ORG_UTILS]: {
            // recorded so a test can assert the owner guard short-circuits before the
            // organization fallback is consulted at all
            isPolicyAssignedToUserOrg: async (...args) => {
                calls.orgAssigned.push(args);
                return orgAssigned;
            },
        },
    });

    const service = new PolicyActionsService(
        'policy-1',
        {},
        { owner: 'did:policy-owner', status: PolicyStatus.PUBLISH, actionsTopicId: '0.0.1', messageId: 'm-1' },
        'user-1'
    );
    return { service, calls };
}

describe('@unit PolicyActionsService.accessPolicy — organization assignments', function () {
    this.timeout(60000);

    const assignedUser = (parent) => ({
        did: 'did:actor',
        parent,
        permissions: [Permissions.ACCESS_POLICY_ASSIGNED],
    });

    it('honours an organization assignment for a member of the policy owner', async () => {
        const { service, calls } = await makeService();

        assert.isTrue(await service.accessPolicy(assignedUser('did:policy-owner')));
        assert.lengthOf(calls.orgAssigned, 1, 'the organization fallback should be consulted');
    });

    it('refuses an organization assignment that belongs to a different owner', async () => {
        const { service, calls } = await makeService();

        assert.isFalse(await service.accessPolicy(assignedUser('did:other-sr')),
            'an assignment cannot cross the policy owner');
        assert.lengthOf(calls.orgAssigned, 0,
            'and the fallback must not even be consulted, so a stale row cannot grant access');
    });

    it('still consults the fallback when the parent is unknown', async () => {
        // a virtual (dry-run) user, or one built from a bare DID, has no parent -
        // treating unknown as mismatched would break dry-run runs
        const { service, calls } = await makeService();

        assert.isTrue(await service.accessPolicy(assignedUser(null)));
        assert.lengthOf(calls.orgAssigned, 1);
    });

    it('leaves a direct entity assignment alone', async () => {
        const { service, calls } = await makeService({ assignedEntity: { id: 'row-1' } });

        assert.isTrue(await service.accessPolicy(assignedUser('did:other-sr')),
            'the owner guard applies to the organization fallback, not to a direct grant');
        assert.lengthOf(calls.orgAssigned, 0);
    });

    it('still grants blanket access regardless of owner', async () => {
        const { service } = await makeService();

        assert.isTrue(await service.accessPolicy({
            did: 'did:actor',
            parent: 'did:other-sr',
            permissions: [Permissions.ACCESS_POLICY_ALL],
        }));
    });
});
