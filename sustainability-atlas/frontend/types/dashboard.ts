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
