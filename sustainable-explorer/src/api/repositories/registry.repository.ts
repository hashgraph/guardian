/** Abstract repository for querying registries; database-specific logic (raw SQL, jsonb operators, tsvector, MV joins) lives in concrete implementations, so services depend only on this interface. */

export interface RegistryListQuery {
    page: number;
    limit: number;
    search?: string;
    displayName?: string;
    did?: string;
    id?: string;
    tags?: string;
    geography?: string;
    law?: string;
    hideEmpty?: boolean;
    createdAtFrom?: string;
    createdAtTo?: string;
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
    relatedTopicId: string | null;
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

/** Filter shape for `findAllForExport` — same filterable fields as `RegistryListQuery` minus pagination/sort. */
export interface RegistryExportFilters {
    search?: string;
    displayName?: string;
    did?: string;
    id?: string;
    tags?: string;
    geography?: string;
    law?: string;
    hideEmpty?: boolean;
    createdAtFrom?: string;
    createdAtTo?: string;
}

/** One row per (deduped, `registryDid`-canonical) registry, keyed to match `export-field-catalog.ts`'s registries catalog rows; `_tokenId` stays null (a registry has no Hedera token) while `_topicId` is the registry's own `relatedTopicId` so `verification_url` still resolves via the topic fallback. */
export interface RegistryExportRow {
    name: string | null;
    did: string | null;
    geography: string | null;
    law: string | null;
    project_count: number;
    ipfs_document_ref: string | null;
    _consensusTimestamp: string | null;
    _tokenId: string | null;
    _topicId: string | null;
    _dataSource: string | null;
}

/** Storage-agnostic repository contract. */
export abstract class RegistryRepository {
    abstract findAll(query: RegistryListQuery): Promise<RegistryListResult>;
    abstract findByDid(did: string): Promise<RegistryRow | null>;
    abstract findById(id: string): Promise<RegistryRow | null>;
    /** Full filtered, `registryDid`-deduped dataset for the export engine — never capped at 1000 rows, never HTTP page-looped by the caller; implementations batch internally. */
    abstract findAllForExport(filters: RegistryExportFilters): Promise<RegistryExportRow[]>;
}
