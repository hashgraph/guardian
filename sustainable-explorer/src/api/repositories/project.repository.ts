/** Abstract repository for querying projects; database-specific logic (raw SQL, jsonb operators, tsvector, LATERAL joins) lives in concrete implementations, so services depend only on this interface. */

export interface IssuanceRow {
    tokenId: string;
    name: string | null;
    symbol: string | null;
    type: string | null;
    supply: number;
    mintDate: string | null;
    rawVc?: Record<string, any> | null;
}

export interface IssuanceEventRow {
    mintConsensusTimestamp: string;
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    type: string | null;
    amount: number | null;
    mintDate: string | null;
    linkMethod: string | null;
    rawVc: Record<string, any> | null;
}

export interface PolicySchemaRow {
    schemaId: string;
    name: string | null;
    isProjectSchema: boolean;
    docType: string;
}

export interface ProjectRow {
    id: string;
    sourceTimestamp: string;
    projectKey: string | null;
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
    issuanceEvents?: IssuanceEventRow[];
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
    instanceTopicId?: string;
}

export interface ProjectListResult {
    rows: ProjectRow[];
    total: number;
}

/** Filter shape for `findAllForExport` — same filterable fields as `ProjectListQuery` minus pagination/sort. */
export interface ProjectExportFilters {
    search?: string;
    name?: string;
    country?: string;
    methodology?: string;
    registry?: string;
    developer?: string;
    vintage?: string;
    status?: string;
    policyTopicId?: string;
    instanceTopicId?: string;
}

/** One row per PROJECT `business_view` row, keyed to match `export-field-catalog.ts`'s projects catalog rows directly. A project has no single canonical mint transaction or Hedera token, so `_consensusTimestamp`/`_tokenId` stay null (rendering blank) while `_topicId` (the project's own instance topic) still resolves a `verification_url` via the topic fallback. */
export interface ProjectExportRow {
    project_name: string | null;
    registry: string | null;
    developer: string | null;
    country: string | null;
    emissions_reduced: number | null;
    reporting_year: number | null;
    mitigation_type: string | null;
    standard: string | null;
    vintage: string | null;
    sdg: string | null;
    ipfs_document_ref: string | null;
    _consensusTimestamp: string | null;
    _tokenId: string | null;
    _topicId: string | null;
    _dataSource: string | null;
}

export interface ActivityEventRow {
    consensusTimestamp: string;
    messageType: string;
    schemaName: string | null;
}

/** Storage-agnostic repository contract. */
export abstract class ProjectRepository {
    abstract findAll(query: ProjectListQuery): Promise<ProjectListResult>;
    abstract findById(id: string): Promise<ProjectRow | null>;
    abstract findActivity(sourceTimestamp: string): Promise<ActivityEventRow[]>;
    /** Full filtered dataset for the export engine — never capped at 1000 rows, never HTTP page-looped by the caller; implementations batch internally. */
    abstract findAllForExport(filters: ProjectExportFilters): Promise<ProjectExportRow[]>;
}
