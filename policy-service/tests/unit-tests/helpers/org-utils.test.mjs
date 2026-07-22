import { assert } from 'chai';

import { OrgRolePermission } from '@guardian/interfaces';

import { getOrgTokenPermissionError } from '../../../dist/policy-engine/helpers/org-token-permission.js';
import { isPolicyAssignedToUserOrg } from '../../../dist/policy-engine/helpers/org-utils.js';

const ORG_ACCOUNT = '0.0.1001';
const OTHER_ACCOUNT = '0.0.2002';

const member = (permissions) => ({
    organization: 'org-1',
    organizationRolePermissions: permissions
});

describe('Org token permission guard (pure decision core)', function () {
    it('returns null for a user with no organization', function () {
        const user = { organization: null, organizationRolePermissions: [] };
        assert.isNull(getOrgTokenPermissionError(user, ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_MINTING));
    });

    it('returns null when the org has no resolved Hedera account', function () {
        assert.isNull(getOrgTokenPermissionError(member([]), null, ORG_ACCOUNT, OrgRolePermission.TOKEN_MINTING));
    });

    it('returns null when the operation account is empty', function () {
        assert.isNull(getOrgTokenPermissionError(member([]), ORG_ACCOUNT, '', OrgRolePermission.TOKEN_MINTING));
    });

    it('returns null when the operation account is not the org account', function () {
        assert.isNull(getOrgTokenPermissionError(member([]), ORG_ACCOUNT, OTHER_ACCOUNT, OrgRolePermission.TOKEN_TRANSFER));
    });

    it('returns null when the member holds the required permission', function () {
        for (const permission of Object.values(OrgRolePermission)) {
            assert.isNull(getOrgTokenPermissionError(member([permission]), ORG_ACCOUNT, ORG_ACCOUNT, permission));
        }
    });

    it('rejects an org-account operation when the permission is missing', function () {
        assert.equal(
            getOrgTokenPermissionError(member([]), ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_MINTING),
            'Insufficient organization permissions for token minting'
        );
        assert.equal(
            getOrgTokenPermissionError(member([]), ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_TRANSFER),
            'Insufficient organization permissions for token transfer'
        );
        assert.equal(
            getOrgTokenPermissionError(member([]), ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_RETIREMENT),
            'Insufficient organization permissions for token retirement'
        );
    });

    it('does not treat one token permission as another', function () {
        assert.equal(
            getOrgTokenPermissionError(
                member([OrgRolePermission.TOKEN_MINTING, OrgRolePermission.TOKEN_RETIREMENT]),
                ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_TRANSFER
            ),
            'Insufficient organization permissions for token transfer'
        );
    });

    it('allows minting when MEMBER_MANAGE is present alongside TOKEN_MINTING', function () {
        assert.isNull(getOrgTokenPermissionError(
            member([OrgRolePermission.TOKEN_MINTING, OrgRolePermission.MEMBER_MANAGE]),
            ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_MINTING
        ));
    });

    it('MEMBER_MANAGE alone is invisible to the token guard — mint is denied', function () {
        assert.equal(
            getOrgTokenPermissionError(
                member([OrgRolePermission.MEMBER_MANAGE]),
                ORG_ACCOUNT, ORG_ACCOUNT, OrgRolePermission.TOKEN_MINTING
            ),
            'Insufficient organization permissions for token minting'
        );
    });
});

describe('isPolicyAssignedToUserOrg (org policy-access gate)', function () {
    it('returns false for a null user, without constructing Users', async function () {
        assert.isFalse(await isPolicyAssignedToUserOrg(null, 'policy-1'));
    });

    it('returns false for an undefined user, without constructing Users', async function () {
        assert.isFalse(await isPolicyAssignedToUserOrg(undefined, 'policy-1'));
    });

    it('returns false for a user with no organization, without constructing Users', async function () {
        assert.isFalse(await isPolicyAssignedToUserOrg({ organization: null, userId: 'u-1' }, 'policy-1'));
    });

    it('returns false for an empty policyId, without constructing Users', async function () {
        assert.isFalse(await isPolicyAssignedToUserOrg({ organization: 'org-1', userId: 'u-1' }, ''));
    });
});
