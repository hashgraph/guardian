/**
 * Abstract repository for the "Impact Summary" combined aggregate: total credits, retirements, active
 * projects/countries, SDG contributions, geographic distribution, sector breakdown, registry breakdown, and
 * methodology count for one network. Database-specific logic lives in the concrete `PgImpactSummaryRepository`.
 */

export interface ImpactSummarySdgRow {
    sdgId: number;
    name: string;
    color: string;
    /** Number of PROJECT rows tagged with this SDG. */
    projectCount: number;
    /** Total credits (ER_y, self-reported) summed across projects tagged with this SDG. */
    credits: number;
}

export interface ImpactSummaryGeoRow {
    /** ISO-ish country label from businessData->>'country'; 'Unknown' when blank/missing. */
    country: string;
    projectCount: number;
    /** On-chain credits issued (mv_project_stats.total_issued) summed across this country's projects. */
    creditsIssued: number;
}

export interface ImpactSummarySectorRow {
    /** Sector label from businessData->>'sector'; 'Unknown' when blank/missing. */
    sector: string;
    projectCount: number;
    creditsIssued: number;
}

export interface ImpactSummaryRegistryRow {
    registryDid: string | null;
    displayName: string | null;
    projectCount: number;
    issuanceCount: number;
    policyCount: number;
}

/** Fully-assembled aggregate for one network; `totalCreditsIssued`/`totalRetiredInferred` are derived by summing `geographicDistribution` so the grand totals and per-country breakdown are always mutually consistent. */
export interface ImpactSummaryRow {
    totalCreditsIssued: number;
    /** Inferred from Mirror-Node-deleted NFT serials (nft_cache.deleted via mv_project_stats) — never a ledger figure. */
    totalRetiredInferred: number;
    activeProjects: number;
    /** Distinct non-'Unknown' countries across PROJECT rows. */
    activeCountries: number;
    sdgContributions: ImpactSummarySdgRow[];
    geographicDistribution: ImpactSummaryGeoRow[];
    /** Raw per-sector rows (Unknown already bucketed at query time); top-N/"Others" collapse happens in the service. */
    sectorBreakdown: ImpactSummarySectorRow[];
    registryBreakdown: ImpactSummaryRegistryRow[];
    /** Deduped by relatedTopicId (business_view is per-message; republished methodologies share a relatedTopicId). */
    methodologyCount: number;
}

export abstract class ImpactSummaryRepository {
    abstract getSummary(network: string): Promise<ImpactSummaryRow>;
}
