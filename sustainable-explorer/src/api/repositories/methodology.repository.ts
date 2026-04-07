/**
 * Abstract repository for querying methodologies.
 *
 * Database-specific logic (raw SQL, jsonb operators, tsvector, MV joins)
 * lives in concrete implementations. Services depend only on this interface
 * so swapping to a different storage backend only requires a new implementation.
 */

export interface MethodologyListQuery {
    page: number;
    limit: number;
    search?: string;
    name?: string;
    id?: string;
    description?: string;
    status?: string;
    registryDid?: string;
    registryName?: string;
    version?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface MethodologyStatsRow {
    projectCount: number;
    issuanceCount: number;
    schemaCount: number;
}

export interface MethodologyRow {
    id: string;
    viewType: string;
    sourceTimestamp: string;
    registryDid: string | null;
    /** Display name of the publishing registry, joined from business_view */
    registryName: string | null;
    relatedTopicId: string | null;
    displayName: string | null;
    description: string | null;
    // Named `statusValue` to avoid colliding with the HTTP-level `status` concept.
    statusValue: string | null;
    businessData: Record<string, unknown> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    stats: MethodologyStatsRow;
}

export interface MethodologyListResult {
    rows: MethodologyRow[];
    total: number;
}

/**
 * Storage-agnostic repository contract.
 */
export abstract class MethodologyRepository {
    abstract findAll(query: MethodologyListQuery): Promise<MethodologyListResult>;
    abstract findById(id: string): Promise<MethodologyRow | null>;
}
