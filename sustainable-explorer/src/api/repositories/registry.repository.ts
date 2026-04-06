/**
 * Abstract repository for querying registries.
 *
 * Database-specific logic (raw SQL, jsonb operators, tsvector, MV joins)
 * lives in concrete implementations. Services depend only on this interface
 * so swapping to a different storage backend only requires a new implementation.
 */

export interface RegistryListQuery {
    page: number;
    limit: number;
    search?: string;
    did?: string;
    geography?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface RegistryStatsRow {
    policyCount: number;
    projectCount: number;
    issuanceCount: number;
    userCount: number;
}

export interface RegistryRow {
    id: string;
    viewType: string;
    sourceTimestamp: string;
    registryDid: string | null;
    policyId: string | null;
    displayName: string | null;
    businessData: Record<string, unknown> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    stats: RegistryStatsRow;
}

export interface RegistryListResult {
    rows: RegistryRow[];
    total: number;
}

/**
 * Storage-agnostic repository contract.
 */
export abstract class RegistryRepository {
    abstract findAll(query: RegistryListQuery): Promise<RegistryListResult>;
    abstract findByDid(did: string): Promise<RegistryRow | null>;
}
