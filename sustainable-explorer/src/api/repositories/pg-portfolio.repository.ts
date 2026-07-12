import { DataSource } from 'typeorm';

export interface PortfolioProjectTotalRow {
    projectKey: string;
    amount: string; // Postgres returns BIGINT as string
}

export interface PortfolioMonthRow {
    month: Date | null;
    amount: string;
}

export interface PortfolioRecentIssuanceRow {
    projectKey: string;
    tokenId: string | null;
    amount: string | null;
    mintDate: Date | null;
}

const MINT_GUARDS = `
    pml.project_key = ANY($1::text[])
    AND pml.token_id IS NOT NULL
    AND pml.amount IS NOT NULL
    AND pml.amount > 0
`;

/**
 * Aggregates project_mint_link rows for a watchlist's project keys — no
 * business_view join. Sector/registry/country/SDG breakdowns are re-derived
 * client-side from Phase 1's batch-fetched project records instead of being
 * pivoted here, so this stays a single-table, index-backed aggregation
 * (idx_pml_project_key) regardless of watchlist size.
 */
export class PgPortfolioRepository {
    constructor(private readonly dataSource: DataSource) {}

    async getProjectTotals(projectKeys: string[]): Promise<PortfolioProjectTotalRow[]> {
        return this.dataSource.query(
            `SELECT pml.project_key AS "projectKey", SUM(pml.amount)::bigint AS amount
             FROM project_mint_link pml
             WHERE ${MINT_GUARDS}
             GROUP BY pml.project_key`,
            [projectKeys],
        );
    }

    async getMonthlySeries(projectKeys: string[]): Promise<PortfolioMonthRow[]> {
        return this.dataSource.query(
            `SELECT DATE_TRUNC('month', pml.mint_date)::date AS month, SUM(pml.amount)::bigint AS amount
             FROM project_mint_link pml
             WHERE ${MINT_GUARDS}
             GROUP BY month
             ORDER BY month ASC NULLS LAST`,
            [projectKeys],
        );
    }

    async getRecentIssuances(projectKeys: string[], limit = 5): Promise<PortfolioRecentIssuanceRow[]> {
        return this.dataSource.query(
            `SELECT pml.project_key AS "projectKey", pml.token_id AS "tokenId",
                    pml.amount::bigint AS amount, pml.mint_date AS "mintDate"
             FROM project_mint_link pml
             WHERE ${MINT_GUARDS}
             ORDER BY pml.mint_date DESC NULLS LAST
             LIMIT ${limit}`,
            [projectKeys],
        );
    }

    async getAggregations(projectKeys: string[]): Promise<[
        PortfolioProjectTotalRow[],
        PortfolioMonthRow[],
        PortfolioRecentIssuanceRow[],
    ]> {
        return Promise.all([
            this.getProjectTotals(projectKeys),
            this.getMonthlySeries(projectKeys),
            this.getRecentIssuances(projectKeys),
        ]);
    }
}
