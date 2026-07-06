import { Users } from '@guardian/common';
import { OrgRolePermission } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { getOrgTokenPermissionError } from './org-token-permission.js';
import type { AnyBlockType } from '../policy-engine.interface.js';
import type { PolicyUser } from '../policy-user.js';

export { getOrgTokenPermissionError };

/**
 * Member-DID lists memoized per acting PolicyUser instance. PolicyUser objects are
 * created fresh for every top-level policy action, so an entry lives for exactly one
 * action — the same reuse window §8.3 documents for org context itself. Never cache
 * by org id in a longer-lived structure: that would let a revoked member's DID keep
 * matching filters across requests.
 */
const orgMemberDidsCache = new WeakMap<object, Promise<string[]>>();

/**
 * Resolves the DID list of all active members of the user's organization.
 * Returns an empty array when the user has no organization.
 * An empty array produces { $in: [] } in filter mode (zero documents — "no org, no access")
 * and Set.has() returns false in validator mode — both are the correct short-circuit behaviours.
 * The fetch happens at most once per policy action (memoized on the PolicyUser instance);
 * a failed lookup rejects every consumer in that action identically (fail closed).
 */
export async function resolveOrgMemberDids(user: Pick<PolicyUser, 'organization'> | null | undefined): Promise<string[]> {
    if (!user?.organization) {
        return [];
    }
    let promise = orgMemberDidsCache.get(user);
    if (!promise) {
        promise = new Users().getOrgMemberDids(user.organization, null)
            .then((dids) => (dids ?? []).filter((did): did is string => !!did));
        orgMemberDidsCache.set(user, promise);
    }
    return promise;
}

/**
 * Org-account-id lookups memoized per acting PolicyUser instance — same lifetime and
 * rationale as orgMemberDidsCache above. A published organization's account id is stable
 * through every legitimate flow, so this window is conservative; it is kept per-action for
 * posture consistency with the org context itself (§8.3).
 */
const orgAccountIdCache = new WeakMap<object, Promise<string | null>>();

/**
 * Resolve an organization's Hedera account id (no key load).
 * Used by token-operation permission guards to detect when an operation targets the org account.
 * Returns null when the user has no organization or the org has no Hedera account.
 * The fetch happens at most once per policy action (memoized on the PolicyUser instance);
 * a failed lookup rejects every consumer in that action identically (fail closed).
 */
export async function getOrgHederaAccountId(
    user: Pick<PolicyUser, 'organization'> | null | undefined,
    userId: string | null
): Promise<string | null> {
    if (!user?.organization) {
        return null;
    }
    let promise = orgAccountIdCache.get(user);
    if (!promise) {
        promise = new Users().getOrgHederaInfo(user.organization, userId)
            .then((info) => info?.hederaAccountId ?? null);
        orgAccountIdCache.set(user, promise);
    }
    return promise;
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
    const orgAccountId = await getOrgHederaAccountId(user, userId);
    const error = getOrgTokenPermissionError(user, orgAccountId, operationAccount, permission);
    if (error) {
        throw new BlockActionError(error, ref.blockType, ref.uuid);
    }
}
