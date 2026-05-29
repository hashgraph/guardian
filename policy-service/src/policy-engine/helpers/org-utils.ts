import { DatabaseServer, KeyType, Users, Wallet } from '@guardian/common';
import { PrivateKey } from '@hiero-ledger/sdk';
import { IHederaCredentials } from '../policy-user.js';
import { AnyBlockType } from '../policy-engine.interface.js';

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
 * Lazily load an organization's Hedera credentials (account id + private key) for signing.
 * NOT used by the guards (they only need getOrgHederaAccountId); provided for callers that
 * must sign with the org key. Key is read from the vault via the low-level Wallet.getKey
 * (walletToken + org DID) — Wallet.getUserKey is NOT used because an Organization is not a User.
 */
export async function loadOrgHederaCredentials(
    orgId: string,
    ref: AnyBlockType,
    userId: string | null
): Promise<IHederaCredentials> {
    if (ref.dryRun) {
        return { hederaAccountId: '0.0.0', hederaAccountKey: PrivateKey.generate().toString() };
    }
    const info = await new Users().getOrgHederaInfo(orgId, userId);
    if (!info?.walletToken) {
        throw new Error(`Organization ${orgId} has no Hedera credentials`);
    }
    const key = await new Wallet().getKey(info.walletToken, KeyType.KEY, info.did);
    return { hederaAccountId: info.hederaAccountId, hederaAccountKey: key };
}
