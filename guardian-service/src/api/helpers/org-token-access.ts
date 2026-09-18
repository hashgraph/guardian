import { OrgRolePermission, OrgTokenPermission } from '@guardian/interfaces';

/**
 * Denial messages, keyed by permission. Kept byte-identical to the policy-service sibling
 * table (`policy-service/src/policy-engine/helpers/org-token-permission.ts`) so the two
 * enforcement layers report the same wording; keep them in sync when adding a permission.
 */
const ORG_TOKEN_ACCESS_ERRORS: Record<OrgTokenPermission, string> = {
    [OrgRolePermission.TOKEN_MINTING]: 'Insufficient organization permissions for token minting',
    [OrgRolePermission.TOKEN_TRANSFER]: 'Insufficient organization permissions for token transfer',
    [OrgRolePermission.TOKEN_RETIREMENT]: 'Insufficient organization permissions for token retirement',
    [OrgRolePermission.TOKEN_ASSOCIATE]: 'Insufficient organization permissions for token association',
    [OrgRolePermission.TOKEN_DISSOCIATE]: 'Insufficient organization permissions for token dissociation',
};

/**
 * Pure decision core of the org-wallet token action guard (associate / dissociate / transfer).
 * No I/O — keep this module free of runtime dependencies so it stays unit-testable in isolation.
 *
 * Mirrors `getOrgTokenPermissionError` (policy-service) at the guardian-service boundary:
 * the org owner always bypasses the check; otherwise the acting user must be an active
 * member of the target organization and hold the given permission on their org role.
 *
 * @param ctx - the acting user's org context (`Users.getOrgContextByDid`), or null when the
 * user has no active membership anywhere.
 * @param isOwner - whether the acting user is the target organization's owner (SR bypass).
 * @param orgId - the organization the token action is being performed against.
 * @param permission - the org-wallet token permission matching the requested action.
 * @returns the error message to reject with, or null when the operation is allowed.
 */
export function getOrgTokenAccessError(
    ctx: { organizationId: string, orgRolePermissions: OrgRolePermission[] } | null,
    isOwner: boolean,
    orgId: string,
    permission: OrgTokenPermission
): string | null {
    if (isOwner) {
        return null;
    }
    if (!ctx || ctx.organizationId !== orgId) {
        return 'User is not an active member of this organization';
    }
    if (!ctx.orgRolePermissions?.includes(permission)) {
        return ORG_TOKEN_ACCESS_ERRORS[permission];
    }
    return null;
}
