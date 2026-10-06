export interface ProjectIssuance {
    tokenId: string;
    name: string | null;
    symbol: string | null;
    type: string | null;
    supply: number;
    mintDate: string | null;
    rawVc?: Record<string, any> | null;
}

/** Reconciliation of an issuance against the ledger. Null means the mint's
 *  VP-Document hasn't been resolved yet, so nothing has been compared. */
export type MintMatchStatus = 'verified' | 'mismatch' | 'unmatched' | 'ambiguous';

export interface IssuanceEvent {
    mintConsensusTimestamp: string;
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    type: string | null;
    /** Amount the MintToken credential declared — a statement of intent. */
    amount: number | null;
    /** Amount the ledger actually minted. Null until reconciled. */
    mintedAmount: number | null;
    /** Serials attributed to this mint. Null for fungible tokens, which have none. */
    serialCount: number | null;
    /** Of those serials, how many are retired. Null for fungible tokens. */
    serialRetiredCount: number | null;
    /** Of those serials, how many are held outside the token treasury. Null for fungible tokens. */
    serialTransferredCount: number | null;
    mintMatchStatus: MintMatchStatus | null;
    mintDate: string | null;
    linkMethod: string | null;
    rawVc: Record<string, any> | null;
}

/** Pagination envelope returned by every paginated API endpoint. */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/**
 * A contiguous run of serials sharing the same retired state.
 *
 * The API returns ranges rather than individual serials: a range is lossless —
 * every serial's status is implied by the range containing it — and a large
 * issuance collapses to a handful of rows instead of tens of thousands.
 */
export interface SerialRange {
    from: number;
    to: number;
    count: number;
    deleted: boolean;
    /** Holder of every serial in the range. Null while ownership syncs, and for retired serials. */
    accountId: string | null;
}

/** One on-chain transaction affecting credits from a mint event. A retirement
 *  names the account that held the credits; a transfer names both parties. */
export interface MintTransaction {
    /** Whether the credits changed hands or left circulation. Classified server-side, so sorting groups the values shown. */
    event: 'retirement' | 'transfer';
    consensusTimestamp: string;
    /** How well documented the offset claim is: 'guardian' — recorded by the registry's retirement contract; 'ledger' — evidenced only by the credits' destruction. Null on transfers. */
    retirementSource: 'guardian' | 'ledger' | null;
    /** Account holding the credits when they left circulation. Retirements only. */
    holderAccountId: string | null;
    senderAccountId: string | null;
    receiverAccountId: string | null;
    serials: number[];
    /** On a transfer, how many of the credits it moved have since been retired; the rest remain tradable. */
    retiredSince: number;
}

export interface MintTransactions {
    mintConsensusTimestamp: string | null;
    /** False when a treasury behind these credits has not been swept yet — an empty result then means "not read yet", not "nothing happened". */
    transferHistorySynced: boolean;
    data: MintTransaction[];
    meta: PaginationMeta;
}

export interface MintSerials {
    mintConsensusTimestamp: string;
    vpConsensusTimestamp: string | null;
    tokenId: string | null;
    mintMatchStatus: MintMatchStatus | null;
    /** Serials this issuance produced in total, across every page of ranges. */
    totalSerials: number;
    activeCount: number;
    retiredCount: number;
    data: SerialRange[];
    meta: PaginationMeta;
}

/** Headline facts about one issuance — the first thing the detail page renders. */
export interface IssuanceSummary {
    mintConsensusTimestamp: string;
    vpConsensusTimestamp: string | null;
    declaredAmount: number | null;
    mintedAmount: number | null;
    mintMatchStatus: MintMatchStatus | null;
    mintDate: string | null;
    serialCount: number | null;
    serialRetiredCount: number | null;
    serialTransferredCount: number | null;
    tokenId: string | null;
    tokenName: string | null;
    tokenSymbol: string | null;
    tokenType: string | null;
    projectId: string | null;
    projectName: string | null;
    methodologyId: string | null;
    methodologyName: string | null;
    registryDid: string | null;
    registryName: string | null;
}

export interface IssuanceTokenInfo {
    tokenId: string | null;
    tokenSupply: number | null;
    decimals: number | null;
    treasury: string | null;
    totalMintedAllProjects: number;
    totalMintedThisProject: number;
    issuanceCount: number;
    tokenCreatedDate: string | null;
    policyTopicId: string | null;
    policyName: string | null;
    issuerDid: string | null;
    relatedProjects: Array<{ projectId: string; projectName: string | null }>;
}

export interface RelatedIssuance {
    mintConsensusTimestamp: string;
    declaredAmount: number | null;
    mintedAmount: number | null;
    mintMatchStatus: MintMatchStatus | null;
    mintDate: string | null;
    projectId: string | null;
    projectName: string | null;
}

export interface RelatedIssuances {
    data: RelatedIssuance[];
    meta: PaginationMeta;
}

export interface LinkedVc {
    consensusTimestamp: string;
    topicId: string;
    csId: string | null;
}

export interface LinkedSchema {
    schemaUuid: string;
    schemaName: string | null;
    isProjectSchema: boolean;
    docType: string;
    vcCount: number;
    linkedVcs: LinkedVc[];
}

export interface VcField {
    label: string;
    value: string;
    description?: string;
}

export interface VcTable {
    label: string;
    columns: string[];
    rows: Record<string, string>[];
}

export interface VcGroup {
    title: string;
    fields: VcField[];
    tables: VcTable[];
}

export interface VcDocData {
    fields: VcField[];
    tables: VcTable[];
    groups: VcGroup[];
}

export interface Milestone {
    key: string;
    label: string;
    state: 'complete' | 'current' | 'expected' | 'pending';
    date: string | null;
    dateType: 'actual' | 'expected' | null;
}

export interface ProjectedIssuance {
    totalTco2e: number | null;
    periodStart: number | null;
    periodEnd: number | null;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    country: string;
    countryCode: string;
    flag: string;
    lat: number;
    lng: number;
    polygon?: string | null;
    methodology: string;
    methodologyId: string;
    registry: string;
    developer: string;
    /** Detail-endpoint only (empty on list responses). All developer emails, in order. */
    developerEmails?: string[];
    /** Detail-endpoint only (empty on list responses). All developer phone numbers, in order. */
    developerPhones?: string[];
    credits: number;
    status: 'Registered' | 'Under Validation' | 'Verified' | 'Issuing' | 'Completed';
    vintage: string;
    sdgs: number[];
    category: string;
    sector: string;
    sectoralScope: string;
    createdAt: string;
    creditingPeriodStart?: string | null;
    creditingPeriodEnd?: string | null;
    topicId?: string;
    policyTopicId?: string;
    instanceTopicId?: string | null;
    registryDid?: string;
    sourceTimestamp?: string;
    projectKey?: string | null;
    issuances?: ProjectIssuance[];
    issuanceEvents?: IssuanceEvent[];
    issuanceCount?: number;
    linkedSchemas?: LinkedSchema[];
    mrvSchemas?: LinkedSchema[];
    hasMrvData?: boolean;
    /** Credits the ledger actually minted. */
    totalIssued?: number;
    /** Credits the MintToken credentials declared; differs when a mint partially failed. */
    totalDeclared?: number;
    totalRetired?: number;
    /** Non-fungible credits held outside the token treasury. Null when transfers can't be determined. */
    totalTransferred?: number | null;
    totalActive?: number;
    rawVc?: Record<string, any>;
    decodeMethod?: string | null;
    metadata?: Record<string, unknown> | null;
    lifecycleStage?: string;
    expectedIssuanceYear?: string | null;
    projectedVolume?: number | null;
    projectedIssuance?: ProjectedIssuance | null;
    milestones?: Milestone[];
}

export interface Credit {
    id: string;
    tokenId: string;
    name: string;
    symbol: string;
    type: 'Fungible' | 'Non-Fungible';
    supply: number;
    projectId: string;
    registry: string;
    mintDate: string;
    rawVc?: Record<string, any>;
}

export interface Transfer {
    id: string;
    creditId: string;
    projectId: string;
    from: string;
    to: string;
    quantity: number;
    date: string;
    txHash: string;
    status: 'Completed' | 'Pending';
}

export interface Retirement {
    id: string;
    creditId: string;
    projectId: string;
    beneficiary: string;
    quantity: number;
    date: string;
    txHash: string;
    reason: string;
    status: 'Completed' | 'Pending';
}

export interface Registry {
    id: string;
    name: string;
    did: string;
    policies: number;
    projects: number;
    users: number;
    credits: string;
    status: 'Active' | 'Inactive';
    network: 'Mainnet' | 'Testnet';
    geography: string | null;
    website: string | null;
    law: string | null;
    tags: string | null;
    createdAt: string | null;
}

export interface Methodology {
    id: string;
    name: string;
    registry: string;
    category: string;
    projects: number;
    credits: string;
    schemas: number;
}

export interface Developer {
    id: string;
    name: string;
    country: string;
    countries: number;
    registries: string[];
    projects: number;
    totalIssued: string;
    totalRetired: string;
    categories: string[];
    status: 'Active' | 'Inactive';
}

export interface CountryStats {
    name: string;
    code: string;
    flag: string;
    lat: number;
    lng: number;
    projects: number;
    credits: number;
    methodologies: number;
}

export interface SdgStats {
    id: number;
    name: string;
    color: string;
    projects: number;
    /** Mint-event count, shown in the Issuances column. */
    issuances: number;
    /** Credit volume issued. */
    credits: number;
    developers: number;
    countries: number;
    topMethodology: string;
}

export interface DashboardStats {
    registries: number;
    methodologies: number;
    projects: number;
    totalCredits: number;
}

export interface ActivityItem {
    time: string;
    action: string;
    detail: string;
    type: 'project' | 'credit' | 'methodology' | 'verification' | 'registry' | 'retirement'
        | 'token' | 'identity' | 'role' | 'other';
}

export interface MapPoint {
    name: string;
    lat: number;
    lng: number;
    credits: string;
}

export interface MapCountry {
    country: string;
    countryCode: string;
    projects: number;
    credits: string;
}
