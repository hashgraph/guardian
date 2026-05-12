/**
 * Abstract repository for querying projects.
 *
 * Database-specific logic (raw SQL, jsonb operators, tsvector, LATERAL joins)
 * lives in concrete implementations. Services depend only on this interface
 * so swapping to a different storage backend only requires a new implementation.
 */

export interface IssuanceRow {
    tokenId: string;
    name: string | null;
    symbol: string | null;
    type: string | null;
    supply: number;
    mintDate: string | null;
    rawVc?: Record<string, any> | null;
}

export interface PolicySchemaRow {
    schemaId: string;
    name: string | null;
    isProjectSchema: boolean;
}

export interface ProjectRow {
    id: string;
    sourceTimestamp: string;
    registryDid: string | null;
    registryName: string | null;
    relatedTopicId: string | null;
    displayName: string | null;
    businessData: Record<string, any> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    issuances?: IssuanceRow[];
    issuanceCount?: number;
    totalIssued?: number;
    totalRetired?: number;
    totalActive?: number;
    policySchemas?: PolicySchemaRow[];
}

export interface ProjectListQuery {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    name?: string;
    country?: string;
    methodology?: string;
    registry?: string;
    developer?: string;
    vintage?: string;
    status?: string;
    policyTopicId?: string;
}

export interface ProjectListResult {
    rows: ProjectRow[];
    total: number;
}

export interface ActivityEventRow {
    consensusTimestamp: string;
    messageType: string;
    schemaName: string | null;
}

/**
 * Storage-agnostic repository contract.
 */
export abstract class ProjectRepository {
    abstract findAll(query: ProjectListQuery): Promise<ProjectListResult>;
    abstract findById(id: string): Promise<ProjectRow | null>;
    abstract findActivity(sourceTimestamp: string): Promise<ActivityEventRow[]>;
}
