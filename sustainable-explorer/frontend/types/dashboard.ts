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
