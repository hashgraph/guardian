export interface MintSeriesEntry {
    month: string;
    amount: number;
}

export interface MintBreakdownEntry {
    label: string;
    amount: number;
}

export interface DashboardMintStatsDto {
    totalMinted: number;
    mintSeries: MintSeriesEntry[];
    bySector: MintBreakdownEntry[];
    byRegistry: MintBreakdownEntry[];
}

// ── Dashboard summary ────────────────────────────────────────────────────────
// Server-side aggregates from GET /:network/dashboard/summary. Country / sector
// / vintage / registry labels arrive as raw stored values; display
// normalisation (ISO country codes, "Unknown" bucketing) stays on the client.

export interface DashboardTotals {
    registries: number;
    methodologies: number;
    projects: number;
    filteredRegistries: number;
    filteredMethodologies: number;
}

export interface DashboardFilterOptions {
    developers: string[];
    registries: string[];
}

export interface CountryAggregate {
    country: string | null;
    projects: number;
    credits: number;
    methodologies: number;
    developer: string | null;
    registry: string | null;
}

export interface LabelCount {
    label: string | null;
    projectCount: number;
    credits: number;
    methodologies: number;
}

export interface CountryBreakdown {
    country: string | null;
    label: string | null;
    projectCount: number;
    credits: number;
}

export interface DashboardMapPoint {
    name: string | null;
    lat: number;
    lng: number;
    credits: number;
}

export interface PortfolioMetrics {
    totalIssued: number;
    totalRetired: number;
    totalActive: number;
    avgVintageYear: number | null;
    avgCreditingPeriodYears: number | null;
}

export interface DeveloperAggregate {
    label: string | null;
    projectCount: number;
    credits: number;
    countryCount: number;
    sectorCount: number;
}

export interface RegistryStatusCell {
    registry: string | null;
    status: string | null;
    projectCount: number;
}

export interface DashboardSummaryDto {
    totals: DashboardTotals;
    filterOptions: DashboardFilterOptions;
    countries: CountryAggregate[];
    registries: LabelCount[];
    sectors: LabelCount[];
    vintages: LabelCount[];
    countrySectors: CountryBreakdown[];
    countryRegistries: CountryBreakdown[];
    mapPoints: DashboardMapPoint[];
    statuses: LabelCount[];
    /** Registered | Validation | Monitoring | Verified | Issued */
    lifecycleStages: LabelCount[];
    methodologies: LabelCount[];
    portfolio: PortfolioMetrics;
    developers: DeveloperAggregate[];
    registryStatuses: RegistryStatusCell[];
}

export interface PortfolioProjectTotal {
    projectKey: string;
    amount: number;
}

export interface PortfolioRecentIssuance {
    projectKey: string;
    tokenId: string | null;
    amount: number | null;
    mintDate: string | null;
}

export interface PortfolioStatsDto {
    totalMinted: number;
    byProjectKey: PortfolioProjectTotal[];
    mintSeries: MintSeriesEntry[];
    recentIssuances: PortfolioRecentIssuance[];
}
