import { OrgRolePermission } from '@guardian/interfaces';
import type { PolicyUser } from '../policy-user.js';

const ORG_TOKEN_PERMISSION_ERRORS: Record<OrgRolePermission, string> = {
    [OrgRolePermission.TOKEN_MINTING]: 'Insufficient organization permissions for token minting',
    [OrgRolePermission.TOKEN_TRANSFER]: 'Insufficient organization permissions for token transfer',
    [OrgRolePermission.TOKEN_RETIREMENT]: 'Insufficient organization permissions for token retirement',
};

/**
 * Pure decision core of the org token-operation guards (no I/O — keep this module free of
 * runtime dependencies so it stays unit-testable in isolation).
 * Returns the error message to reject with, or null when the operation is allowed:
 * the guard applies only when the operation's account is the organization's account,
 * and rejects only when the member's role lacks the required permission.
 */
export function getOrgTokenPermissionError(
    user: Pick<PolicyUser, 'organization' | 'organizationRolePermissions'>,
    orgAccountId: string | null,
    operationAccount: string,
    permission: OrgRolePermission
): string | null {
    if (!user?.organization || !orgAccountId || !operationAccount) {
        return null;
    }
    if (operationAccount !== orgAccountId) {
        return null;
    }
    if (user.organizationRolePermissions?.includes(permission)) {
        return null;
    }
    return ORG_TOKEN_PERMISSION_ERRORS[permission];
}
