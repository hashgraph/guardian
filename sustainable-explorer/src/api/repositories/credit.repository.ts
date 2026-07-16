/** Abstract repository for querying credits; database-specific logic (raw SQL, jsonb operators, joins) lives in concrete implementations, so services depend only on this interface. */

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

/** Filter shape for `findAllForExport` — same filterable fields as `CreditListQuery` minus pagination and sort (export rows are always ordered by mint consensus timestamp ascending, for a stable/deterministic file). */
export interface CreditExportFilters {
    search?: string;
    type?: string;
    registry?: string;
    registryDid?: string;
    tokenId?: string;
    projectKey?: string;
    methodologyId?: string;
}

/** One row per MintToken VC (mint event), not aggregated by (tokenId, project_key) like `CreditRow` — the export grain stays per-transaction so `transaction_id` (the mint event's own consensus timestamp) never collapses distinct transactions into one row. */
export interface CreditExportRow {
    project_name: string | null;
    registry: string | null;
    developer: string | null;
    country: string | null;
    token_name: string | null;
    token_symbol: string | null;
    token_type: 'Fungible' | 'Non-Fungible' | null;
    emissions_reduced: number | null;
    reporting_year: number | null;
    mitigation_type: string | null;
    standard: string | null;
    mint_amount: number | null;
    vintage: string | null;
    ipfs_document_ref: string | null;
    /** Raw identifiers for `ExportsService`'s shared Traceability synthesis — not catalog keys themselves. */
    _consensusTimestamp: string | null;
    _tokenId: string | null;
    _topicId: string | null;
    _dataSource: string | null;
}

export interface CreditProjectLink {
    projectId: string | null;
    project: string | null;
}

/** Raw underlying data for one credit/token (the actual HCS messages), returned by the /credits/:tokenId/raw endpoint for the "raw data" viewer. */
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

/** Storage-agnostic repository contract. */
export abstract class CreditRepository {
    abstract findAll(query: CreditListQuery): Promise<CreditListResult>;
    abstract findRaw(tokenId: string): Promise<CreditRawDetail | null>;
    /** Full filtered dataset for the export engine — never capped at 1000 rows, never HTTP page-looped by the caller; implementations batch internally. */
    abstract findAllForExport(filters: CreditExportFilters): Promise<CreditExportRow[]>;
}
