import { DatabaseServer } from '@guardian/common';

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
    const members = await DatabaseServer.getOrganizationMembers({ organizationId: organization, active: true });
    return members.map(m => m.did).filter((did): did is string => !!did);
}
