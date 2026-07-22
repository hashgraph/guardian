import { OrgRolePermission } from '@guardian/interfaces';

/**
 * Pure decision core of the org-wallet token association/dissociation guard. No I/O — keep
 * this module free of runtime dependencies so it stays unit-testable in isolation.
 *
 * Mirrors `getOrgTokenPermissionError` (policy-service) at the guardian-service boundary:
 * the org owner always bypasses the check; otherwise the acting user must be an active
 * member of the target organization and hold the given permission on their org role.
 *
 * @param ctx - the acting user's org context (`Users.getOrgContextByDid`), or null when the
 * user has no active membership anywhere.
 * @param isOwner - whether the acting user is the target organization's owner (SR bypass).
 * @param orgId - the organization the token association is being performed against.
 * @param permission - TOKEN_ASSOCIATE or TOKEN_DISSOCIATE, matching the requested action.
 * @returns the error message to reject with, or null when the operation is allowed.
 */
export function getOrgAssociatePermissionError(
    ctx: { organizationId: string, orgRolePermissions: OrgRolePermission[] } | null,
    isOwner: boolean,
    orgId: string,
    permission: OrgRolePermission.TOKEN_ASSOCIATE | OrgRolePermission.TOKEN_DISSOCIATE
): string | null {
    if (isOwner) {
        return null;
    }
    if (!ctx || ctx.organizationId !== orgId) {
        return 'User is not an active member of this organization';
    }
    if (!ctx.orgRolePermissions?.includes(permission)) {
        return permission === OrgRolePermission.TOKEN_ASSOCIATE
            ? 'Insufficient organization permissions for token association'
            : 'Insufficient organization permissions for token dissociation';
    }
    return null;
}
