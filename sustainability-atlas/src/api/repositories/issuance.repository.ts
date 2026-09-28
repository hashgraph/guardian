/**
 * Read model for a single issuance (one MintToken credential).
 *
 * The credit pages were previously keyed on token id, which cannot address an
 * issuance: a token routinely carries several mint events. Everything here is
 * scoped by `mint_consensus_timestamp`, the credential's own identifier.
 *
 * Split into three reads rather than one aggregate so the page can paint from
 * the small summary while the heavier token context and related lists load
 * independently.
 */

/** Headline facts about one issuance — small, and the first thing the page needs. */
export interface IssuanceSummaryRow {
    mintConsensusTimestamp: string;
    /** Mint VP-Document timestamp; the value Guardian stamps on-chain. */
    vpConsensusTimestamp: string | null;
    /** Amount the MintToken credential declared. */
    declaredAmount: number | null;
    /** Amount the ledger actually minted. Null until reconciled. */
    mintedAmount: number | null;
    mintMatchStatus: string | null;
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

/** Token-level context plus the provenance fields the Advanced section shows. */
export interface IssuanceTokenInfoRow {
    tokenId: string | null;
    tokenSupply: number | null;
    decimals: number | null;
    treasury: string | null;
    /** Minted across every project that shares this token. */
    totalMintedAllProjects: number;
    /** Minted for the project this issuance belongs to. */
    totalMintedThisProject: number;
    issuanceCount: number;
    tokenCreatedDate: string | null;
    policyTopicId: string | null;
    policyName: string | null;
    issuerDid: string | null;
    relatedProjects: Array<{ projectId: string; projectName: string | null }>;
}

/** Another issuance of the same token. */
export interface RelatedIssuanceRow {
    mintConsensusTimestamp: string;
    declaredAmount: number | null;
    mintedAmount: number | null;
    mintMatchStatus: string | null;
    mintDate: string | null;
    projectId: string | null;
    projectName: string | null;
}

export interface RelatedIssuancesResult {
    total: number;
    issuances: RelatedIssuanceRow[];
}

export abstract class IssuanceRepository {
    abstract findSummary(mintConsensusTimestamp: string): Promise<IssuanceSummaryRow | null>;
    abstract findTokenInfo(mintConsensusTimestamp: string): Promise<IssuanceTokenInfoRow | null>;
    abstract findRelatedIssuances(
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<RelatedIssuancesResult | null>;
}
