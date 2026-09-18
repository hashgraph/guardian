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
    /** Consensus timestamp of the mint VP-Document. Guardian writes it into each NFT's metadata, or into the fungible TOKENMINT transaction's memo. */
    vpConsensusTimestamp: string | null;
    /** What the ledger actually minted, in display units. Null until reconciled. Compare against `amount`, which is only what the MintToken VC declared. */
    mintedAmount: number | null;
    /** NFT serials carrying this mint's VP timestamp in their metadata. Null for fungible tokens. */
    serialCount: number | null;
    /** Of those serials, how many Mirror Node marks deleted (retired). Null for fungible tokens. */
    serialRetiredCount: number | null;
    /** Of those serials, how many are held outside the token's treasury — i.e. transferred out. Null for fungible tokens. */
    serialTransferredCount: number | null;
    /** verified | mismatch | unmatched | ambiguous | null — reconciliation of `mintedAmount` against the VC's declared `amount`. */
    mintMatchStatus: string | null;
}

/**
 * A contiguous run of serials sharing the same retired state.
 *
 * Serials are returned as ranges rather than individually because a range is
 * lossless — every serial's status is implied by the range containing it — and
 * the difference in volume is decisive: a 42,278-serial issuance is one range.
 */
export interface SerialRangeRow {
    from: number;
    to: number;
    /** Serials in this range; `to - from + 1`, carried so callers needn't recompute. */
    count: number;
    deleted: boolean;
    /** Account holding every serial in the range. Null when ownership hasn't synced, and for retired serials, which no longer have a holder. */
    accountId: string | null;
}

/**
 * One on-chain event affecting credits from a single mint event.
 *
 * Retirements come from Guardian's retirement contract, which names the retiring
 * account and the exact serials. Transfers come from the Hedera CRYPTOTRANSFER
 * itself — Guardian writes no transfer document — and are grouped back into the
 * transaction that moved them, since one distribution moves many serials.
 */
export interface MintTransactionRow {
    /**
     * Whether the credits changed hands or left circulation — exactly one of two
     * values.
     *
     * A transfer that destroyed every credit it moved, and was their last
     * movement, is a retirement in substance: those credits can never be sold or
     * claimed again, whether or not the registry's retirement contract recorded
     * it. Classifying server-side keeps that judgement in one place and lets
     * sorting group the values consumers actually display.
     */
    event: 'retirement' | 'transfer';
    consensusTimestamp: string;
    /** How well documented the offset claim is: recorded by the registry's retirement contract, or evidenced only by the credits' destruction. Null on transfers. */
    retirementSource: 'guardian' | 'ledger' | null;
    /** Account holding the credits at the moment they left circulation. Retirements only — where destruction is the only evidence, that is the last transfer's recipient, not its sender. */
    holderAccountId: string | null;
    /** Transfers only. A retirement has no counterparty: the credits left circulation rather than moving to another account. */
    senderAccountId: string | null;
    receiverAccountId: string | null;
    /** Serials from this mint event affected by this transaction. */
    serials: number[];
    /**
     * On a transfer, how many of the credits it moved have since been retired.
     *
     * A partial claim: part of the lot was surrendered as an offset while the
     * rest stayed tradable in the receiving account. Always 0 on a retirement,
     * which covers every credit it names.
     */
    retiredSince: number;
}

export interface MintTransactionsResult {
    total: number;
    transactions: MintTransactionRow[];
    /**
     * Whether every treasury behind these credits has had its transfer history
     * ingested.
     *
     * False means transfers may exist that have not been read yet, so an empty
     * result is "not known yet" rather than "nothing happened" — a distinction
     * the reader cannot otherwise make, since both look like an empty table.
     * Retirements are unaffected: they come from the retirement contracts, not
     * from the treasury sweep.
     */
    transferHistorySynced: boolean;
}

export interface MintSerialsResult {
    mintConsensusTimestamp: string;
    vpConsensusTimestamp: string | null;
    tokenId: string | null;
    mintMatchStatus: string | null;
    /** Serials this issuance produced, in total — not the size of the current page. */
    totalSerials: number;
    activeCount: number;
    retiredCount: number;
    /** Total ranges, for pagination; `ranges` holds only the requested page. */
    totalRanges: number;
    ranges: SerialRangeRow[];
}

export interface PolicySchemaRow {
    schemaId: string;
    name: string | null;
    isProjectSchema: boolean;
    docType: string;
    /** True when this schema is bound to an `externalDataBlock` (pushed external/IoT MRV data). */
    isMrvSchema: boolean;
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
    /** Credits the ledger actually minted, with the VC-declared amount as fallback for mints not yet reconciled. */
    totalIssued?: number;
    /** Credits the MintToken VCs declared. Differs from totalIssued whenever a mint partially failed. */
    totalDeclared?: number;
    totalRetired?: number;
    /** Non-fungible credits held outside the token's treasury. Null when unknowable — fungible balances can't be traced to a mint, and serial ownership may still be syncing. */
    totalTransferred?: number | null;
    totalActive?: number;
    policySchemas?: PolicySchemaRow[];
    polygon?: string | null;
    /**
     * mv_project_lifecycle-sourced values (list path only — findById never
     * joins this MV). Null/undefined means "not available yet" (e.g. a
     * project created since the last MV refresh), in which case
     * ProjectResponseDto.fromRow falls back to the Node computation.
     */
    lifecycleStage?: string | null;
    expectedIssuanceYear?: string | null;
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
    registryDid?: string;
    developer?: string;
    vintage?: string;
    status?: string;
    policyTopicId?: string;
    instanceTopicId?: string;
    sector?: string;
    sectoralScope?: string;
    /** `min|max` vintage year range — either bound may be empty. */
    vintageRange?: string;
    /**
     * Scoped-view deep link (e.g. from a Methodology detail page's "Projects"
     * card): matches a project whose instanceTopicId OR policyTopicId equals
     * this value — not expressible via the generic per-field FieldSchema
     * (AND-only), handled as a one-off OR clause in the repository.
     */
    methodologyId?: string;
    /** Restrict results to these sourceTimestamp IDs (watchlist batch fetch). */
    sourceTimestamps?: string[];
    /** `|`-delimited SDG numbers — match-any. */
    sdgs?: string;
    /** `|`-delimited lifecycle stage names — match-any. */
    lifecycleStage?: string;
    /** `min|max` expected-issuance-year range — either bound may be empty. */
    expectedIssuanceYearRange?: string;
    /** `'true'` = pipeline (not yet issued), `'false'` = issued. No own column — see PgProjectRepository. */
    isPipeline?: string;
    /**
     * When provided, the count/summary queries are skipped and these values are
     * returned as-is — the search predicate still runs once for the rows query,
     * but not three times. Set by ProjectsService from a short-lived cache keyed
     * on every field above except page/limit, since paging through an unchanged
     * search always yields the same total/summary as page 1.
     */
    cachedCountAndSummary?: { total: number; summary: ProjectListSummary };
}

export interface ProjectListSummary {
    totalIssuances: number;
    uniqueCountries: number;
    uniqueRegistries: number;
}

export interface ProjectListResult {
    rows: ProjectRow[];
    total: number;
    summary: ProjectListSummary;
}

export interface MethodologyFilterOptionRow {
    topicId: string;
    name: string | null;
    version: string | null;
}

export interface ProjectFilterOptionsRow {
    registries: string[];
    developers: string[];
    statuses: string[];
    sectors: string[];
    sectoralScopes: string[];
    vintages: string[];
    countries: string[];
    methodologies: MethodologyFilterOptionRow[];
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
    sector?: string;
    sectoralScope?: string;
    vintageRange?: string;
    sdgs?: string;
    lifecycleStage?: string;
    expectedIssuanceYearRange?: string;
    isPipeline?: string;
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
    /** Distinct filter-dropdown option values across the whole PROJECT set (unfiltered). */
    abstract getFilterOptions(): Promise<ProjectFilterOptionsRow>;
    /** NFT serials attributed to one of this project's mint events via the NFT-metadata→VP linkage; null when the mint doesn't belong to the project. */
    /** Serial ranges for one issuance. `projectId` null skips the ownership guard (issuance-scoped routes); a value restricts the mint to that project. */
    abstract findMintSerials(
        projectId: string | null,
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<MintSerialsResult | null>;
    /** Retirement and transfer transactions affecting the project's credits, newest first. Pass a mint timestamp to scope to one issuance, or null for every issuance of the project. Null result when nothing matches the project. */
    abstract findMintTransactions(
        projectId: string | null,
        mintConsensusTimestamp: string | null,
        page: number,
        limit: number,
        sortBy?: string,
        sortDir?: 'asc' | 'desc',
    ): Promise<MintTransactionsResult | null>;
}
