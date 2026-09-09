import assert from 'node:assert/strict';
import { OrgRolePermission } from '@guardian/interfaces';
import { getOrgTokenAccessError } from '../../dist/api/helpers/org-token-access.js';

// getOrgTokenAccessError is the pure decision core of the org-wallet token action guard
// (associate / dissociate / transfer): org owner always bypasses; otherwise the acting user
// must be an active member of the target organization and hold the matching permission.
describe('getOrgTokenAccessError', () => {
    it('returns null when isOwner is true, even with a null ctx (owner bypass)', () => {
        assert.equal(
            getOrgTokenAccessError(null, true, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            null
        );
    });

    it('returns the not-a-member error for a null ctx', () => {
        assert.equal(
            getOrgTokenAccessError(null, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            'User is not an active member of this organization'
        );
    });

    it('returns the not-a-member error when ctx belongs to a different organization', () => {
        const ctx = { organizationId: 'org-2', orgRolePermissions: [OrgRolePermission.TOKEN_ASSOCIATE] };
        assert.equal(
            getOrgTokenAccessError(ctx, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            'User is not an active member of this organization'
        );
    });

    it('returns null for a member of the org holding the required permission', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [OrgRolePermission.TOKEN_ASSOCIATE] };
        assert.equal(
            getOrgTokenAccessError(ctx, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            null
        );
    });

    it('returns the association error for a member missing TOKEN_ASSOCIATE', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [] };
        assert.equal(
            getOrgTokenAccessError(ctx, false, 'org-1', OrgRolePermission.TOKEN_ASSOCIATE),
            'Insufficient organization permissions for token association'
        );
    });

    it('returns the dissociation error for a member missing TOKEN_DISSOCIATE', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [OrgRolePermission.TOKEN_ASSOCIATE] };
        assert.equal(
            getOrgTokenAccessError(ctx, false, 'org-1', OrgRolePermission.TOKEN_DISSOCIATE),
            'Insufficient organization permissions for token dissociation'
        );
    });

    it('returns null for a member of the org holding TOKEN_TRANSFER', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [OrgRolePermission.TOKEN_TRANSFER] };
        assert.equal(
            getOrgTokenAccessError(ctx, false, 'org-1', OrgRolePermission.TOKEN_TRANSFER),
            null
        );
    });

    it('returns the transfer error for a member missing TOKEN_TRANSFER', () => {
        const ctx = { organizationId: 'org-1', orgRolePermissions: [] };
        assert.equal(
            getOrgTokenAccessError(ctx, false, 'org-1', OrgRolePermission.TOKEN_TRANSFER),
            'Insufficient organization permissions for token transfer'
        );
    });

    it('returns null for owner bypass with TOKEN_TRANSFER and a null ctx', () => {
        assert.equal(
            getOrgTokenAccessError(null, true, 'org-1', OrgRolePermission.TOKEN_TRANSFER),
            null
        );
    });
});
