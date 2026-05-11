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
    /** credentialSubject.id of the linked project (resolved via MintToken VC chain). */
    projectId: string | null;
    /** Display name of the linked project, joined from business_view PROJECT. */
    project: string | null;
    registry: string | null;
    registryDid: string | null;
    mintDate: string | null;
}

export interface CreditListResult {
    rows: CreditRow[];
    total: number;
}

/**
 * Raw underlying data for one credit/token — the actual HCS messages.
 * Returned by the /credits/:tokenId/raw endpoint for the "raw data" viewer.
 */
export interface CreditRawDetail {
    credit: CreditRow | null;
    /** Raw Token-issue message from HCS (one row from `message` table). */
    tokenMessage: Record<string, unknown> | null;
    /** MintToken VC documents that issued tokens against this tokenId. */
    mintEvents: Array<{
        consensusTimestamp: string;
        topicId: string;
        amount: string | null;
        date: string | null;
        document: Record<string, unknown> | null;
    }>;
}

/**
 * Storage-agnostic repository contract.
 */
export abstract class CreditRepository {
    abstract findAll(query: CreditListQuery): Promise<CreditListResult>;
    abstract findRaw(tokenId: string): Promise<CreditRawDetail | null>;
}
