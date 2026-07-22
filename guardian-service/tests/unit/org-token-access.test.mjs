import assert from 'node:assert/strict';
import { OrgRolePermission } from '@guardian/interfaces';
import { getOrgAssociatePermissionError } from '../../dist/api/helpers/org-token-access.js';

// getOrgAssociatePermissionError is the pure decision core of the org-wallet token
// associate/dissociate guard: org owner always bypasses; otherwise the acting user must be
// an active member of the target organization and hold the matching permission.
describe('getOrgAssociatePermissionError', () => {
    it('returns null when isOwner is true, even with a null ctx (owner bypass)', () => {
        assert.equal(
            getOrgAssociatePermissionError(null, true, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            null
        );
    });

    it('returns the not-a-member error for a null ctx', () => {
        assert.equal(
            getOrgAssociatePermissionError(null, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            'User is not an active member of this organization'
        );
    });

    it('returns the not-a-member error when ctx belongs to a different organization', () => {
        const ctx = { organizationId: 'org-2', orgRolePermissions: [OrgRolePermission.TOKEN_ASSOCIATE] };
        assert.equal(
            getOrgAssociatePermissionError(ctx, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            'User is not an active member of this organization'
        );
    });

    it('returns null for a member of the org holding the required permission', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [OrgRolePermission.TOKEN_ASSOCIATE] };
        assert.equal(
            getOrgAssociatePermissionError(ctx, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            null
        );
    });

    it('returns the association error for a member missing TOKEN_ASSOCIATE', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [] };
        assert.equal(
            getOrgAssociatePermissionError(ctx, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            'Insufficient organization permissions for token association'
        );
    });

    it('returns the dissociation error for a member missing TOKEN_DISSOCIATE', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [OrgRolePermission.TOKEN_ASSOCIATE] };
        assert.equal(
            getOrgAssociatePermissionError(ctx, false, 'org-1', OrgRolePermission.TOKEN_DISSOCIATE),
            'Insufficient organization permissions for token dissociation'
        );
    });
});
