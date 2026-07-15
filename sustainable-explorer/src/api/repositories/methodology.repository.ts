/** Abstract repository for querying methodologies; database-specific logic (raw SQL, jsonb operators, tsvector, MV joins) lives in concrete implementations, so services depend only on this interface. */

import { IssuanceRow } from './project.repository';
export { IssuanceRow };

export interface MethodologyListQuery {
    page: number;
    limit: number;
    search?: string;
    name?: string;
    id?: string;
    description?: string;
    decodeStatus?: ('success' | 'failed' | 'pending' | 'unknown')[];
    registryDid?: string;
    registryName?: string;
    version?: string;
    policyTopicId?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface MethodologyStatsRow {
    projectCount: number;
    instanceProjectCount: number;
    issuanceCount: number;
    instanceIssuanceCount: number;
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
    sectoralScopes: string[] | null;
    emissionReductionApproach: string | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    stats: MethodologyStatsRow;
    /** Token issuances linked to this methodology's policy topic. Only populated by findById. */
    issuances?: IssuanceRow[];
    totalIssued?: number;
    totalRetired?: number;
    totalActive?: number;
    /** Decode status from policy table ('success' / 'pending' / 'failed' / null). */
    decodeStatus: string | null;
    /** IPFS CID of the policy ZIP (policy.sourceCid). Only populated by findById. */
    policySourceCid?: string | null;
}

export interface MethodologyListResult {
    rows: MethodologyRow[];
    total: number;
}

/** Filter shape for `findAllForExport` — same filterable fields as `MethodologyListQuery` minus pagination/sort. */
export interface MethodologyExportFilters {
    search?: string;
    name?: string;
    id?: string;
    description?: string;
    decodeStatus?: ('success' | 'failed' | 'pending' | 'unknown')[];
    registryDid?: string;
    registryName?: string;
    version?: string;
    policyTopicId?: string;
}

/** One row per (deduped, `relatedTopicId`-canonical) methodology, keyed to match `export-field-catalog.ts`'s methodologies catalog rows; `_tokenId` stays null (a methodology has no Hedera token) while `_topicId` is the methodology's own `relatedTopicId` so `verification_url` still resolves via the topic fallback. */
export interface MethodologyExportRow {
    name: string | null;
    registry: string | null;
    version: string | null;
    mitigation_type: string | null;
    standard: string | null;
    ipfs_document_ref: string | null;
    _consensusTimestamp: string | null;
    _tokenId: string | null;
    _topicId: string | null;
    _dataSource: string | null;
}

/** Storage-agnostic repository contract. */
export abstract class MethodologyRepository {
    abstract findAll(query: MethodologyListQuery): Promise<MethodologyListResult>;
    abstract findById(id: string): Promise<MethodologyRow | null>;
    /** Full filtered, `relatedTopicId`-deduped dataset for the export engine — never capped at 1000 rows, never HTTP page-looped by the caller; implementations batch internally. */
    abstract findAllForExport(filters: MethodologyExportFilters): Promise<MethodologyExportRow[]>;
}
