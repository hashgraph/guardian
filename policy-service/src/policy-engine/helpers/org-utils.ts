import { Users } from '@guardian/common';

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
