/**
 * Abstract repository for querying methodologies.
 *
 * Database-specific logic (raw SQL, jsonb operators, tsvector, MV joins)
 * lives in concrete implementations. Services depend only on this interface
 * so swapping to a different storage backend only requires a new implementation.
 */

import { IssuanceRow } from './project.repository';
export { IssuanceRow };

export interface MethodologyListQuery {
    page: number;
    limit: number;
    search?: string;
    name?: string;
    id?: string;
    description?: string;
    decodeStatus?: 'success' | 'failed' | 'pending' | 'unknown';
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

/**
 * Storage-agnostic repository contract.
 */
export abstract class MethodologyRepository {
    abstract findAll(query: MethodologyListQuery): Promise<MethodologyListResult>;
    abstract findById(id: string): Promise<MethodologyRow | null>;
}
