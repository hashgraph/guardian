import { Users } from '@guardian/common';
import { OrgRolePermission } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { getOrgTokenPermissionError } from './org-token-permission.js';
import type { AnyBlockType } from '../policy-engine.interface.js';
import type { PolicyUser } from '../policy-user.js';

export { getOrgTokenPermissionError };

/**
 * Resolves the DID list of all active members of an organization.
 * Returns an empty array when organization is null/undefined/empty.
 * An empty array produces { $in: [] } in filter mode (zero documents — "no org, no access")
 * and Set.has() returns false in validator mode — both are the correct short-circuit behaviours.
 */
export async function resolveOrgMemberDids(organization: string | null | undefined): Promise<string[]> {
    if (!organization) {
        return [];
    }
    const dids = await new Users().getOrgMemberDids(organization, null);
    return (dids ?? []).filter((did): did is string => !!did);
}

/**
 * Resolve an organization's Hedera account id (no key load).
 * Used by token-operation permission guards to detect when an operation targets the org account.
 * Returns null when the org id is falsy or the org has no Hedera account.
 */
export async function getOrgHederaAccountId(
    orgId: string,
    userId: string | null
): Promise<string | null> {
    if (!orgId) {
        return null;
    }
    const info = await new Users().getOrgHederaInfo(orgId, userId);
    return info?.hederaAccountId ?? null;
}

/**
 * Org token-operation permission guard — the single enforcement contract for
 * TOKEN_MINTING / TOKEN_TRANSFER / TOKEN_RETIREMENT. Call it wherever a token
 * operation's account has been resolved, before any Hedera side effect.
 *
 * No org membership (or no account to check) → no-op: covers non-members, removed
 * members and dry-run virtual users (whose org context is always empty).
 * A failed org lookup rejects and aborts the block action (fail closed) — this
 * function must never catch the getOrgHederaAccountId rejection.
 */
export async function checkOrgTokenPermission(
    ref: AnyBlockType,
    user: PolicyUser,
    operationAccount: string,
    permission: OrgRolePermission,
    userId: string | null
): Promise<void> {
    if (!user?.organization || !operationAccount) {
        return;
    }
    const orgAccountId = await getOrgHederaAccountId(user.organization, userId);
    const error = getOrgTokenPermissionError(user, orgAccountId, operationAccount, permission);
    if (error) {
        throw new BlockActionError(error, ref.blockType, ref.uuid);
    }
}
