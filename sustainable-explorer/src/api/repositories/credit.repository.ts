/**
 * Abstract repository for querying credits.
 *
 * Database-specific logic (raw SQL, jsonb operators, token_cache join, LATERAL)
 * lives in concrete implementations. Services depend only on this interface
 * so swapping to a different storage backend only requires a new implementation.
 */

export interface CreditListQuery {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    registry?: string;
    registryDid?: string;
    tokenId?: string;
    projectKey?: string;
    methodologyId?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface CreditRow {
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    /** Normalised type: 'Fungible' | 'Non-Fungible' | null */
    type: 'Fungible' | 'Non-Fungible' | null;
    supply: number;
    /** credentialSubject.id of the linked project (resolved via project_mint_link). */
    projectId: string | null;
    /** Display name of the linked project, joined from business_view PROJECT. */
    project: string | null;
    /** sourceTimestamp of the linked methodology, resolved via project or direct topic match. */
    methodologyId: string | null;
    /** Display name of the linked methodology, joined from business_view METHODOLOGY. */
    methodology: string | null;
    registry: string | null;
    registryDid: string | null;
    mintDate: string | null;
}

export interface CreditListResult {
    rows: CreditRow[];
    total: number;
}

export interface CreditProjectLink {
    projectId: string | null;
    project: string | null;
}

/**
 * Raw underlying data for one credit/token — the actual HCS messages.
 * Returned by the /credits/:tokenId/raw endpoint for the "raw data" viewer.
 */
export interface CreditRawDetail {
    credit: CreditRow | null;
    /** All distinct projects linked to this tokenId via project_mint_link. */
    projects: CreditProjectLink[];
    /** Raw Token-issue message from HCS (one row from `message` table). */
    tokenMessage: Record<string, unknown> | null;
    /** Policy ID governing this token, resolved via the linked project's originating VC message. Null when no project is attributed or its VC has no policyId. */
    policyId: string | null;
    /** Resolved policy display name (Instance-Policy options.name), joined via policyId -> policy. Null when unresolved. */
    policyName: string | null;
    /** Hedera topic id of the governing policy (policy.policyTopicId), for the HashScan link. Null when the policy is unresolved. */
    policyTopicId: string | null;
    /** MintToken VC documents that issued tokens against this tokenId. */
    mintEvents: Array<{
        consensusTimestamp: string;
        topicId: string;
        amount: string | null;
        date: string | null;
        document: Record<string, unknown> | null;
        projectKey: string | null;
        type: string | null;
    }>;
}

/**
 * Storage-agnostic repository contract.
 */
export abstract class CreditRepository {
    abstract findAll(query: CreditListQuery): Promise<CreditListResult>;
    abstract findRaw(tokenId: string): Promise<CreditRawDetail | null>;
}
