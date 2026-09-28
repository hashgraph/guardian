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

    /**
     * Retirement volume by month for the watchlist's projects.
     *
     * Only Guardian's retirement contracts date a retirement, so this covers
     * documented retirements alone; credits destroyed without one are visible on
     * the ledger but carry no date and cannot be placed on a time axis.
     *
     * Counts the same credits as the page's retired total, so the chart and the
     * stat card agree: only credits provably minted through Guardian. A
     * non-fungible credit qualifies through the issuance that minted its serial;
     * a fungible one through its token's RETIRE contract events, and only where
     * that token belongs to a single project. Serials matching no mint link are
     * excluded — nothing ties them to a policy.
     *
     * Each credit is dated documented-first, the same precedence the credit
     * lifecycle uses: the retirement contract's timestamp where one exists, and
     * otherwise the credit's last movement — the point at which it left
     * circulation.
     */
    async getRetirementSeries(projectKeys: string[]): Promise<PortfolioMonthRow[]> {
        return this.dataSource.query(
            `WITH sole_project_tokens AS (
                SELECT token_id
                FROM project_mint_link
                WHERE token_id IS NOT NULL
                GROUP BY token_id
                HAVING COUNT(DISTINCT project_key) = 1
                   AND MIN(project_key) = ANY($1::text[])
            ),
            mint_project AS (
                -- One project per (token, mint VP), so a serial cannot match
                -- two mint links and be counted twice.
                SELECT token_id, vp_consensus_timestamp, MIN(project_key) AS project_key
                FROM project_mint_link
                WHERE token_id IS NOT NULL AND vp_consensus_timestamp IS NOT NULL
                GROUP BY token_id, vp_consensus_timestamp
            ),
            retired_credits AS (
                -- Only serials a Guardian mint event claims. A retired serial
                -- matching no mint link is not provably an issuance, so it is
                -- dropped rather than charged to the token's project. Backed by
                -- the partial index on deleted serials.
                SELECT n."tokenId" AS token_id, n."serialNumber" AS serial
                FROM nft_cache n
                JOIN mint_project mp
                    ON mp.token_id = n."tokenId"
                   AND mp.vp_consensus_timestamp = n."metadataTimestamp"
                WHERE n.deleted
                  AND mp.project_key = ANY($1::text[])
            ),
            -- Both date sets are built once and hash-joined rather than asked
            -- per credit.
            retire_dates AS (
                SELECT tre.token_id, s AS serial, MIN(tre.consensus_timestamp) AS ts
                FROM token_retire_event tre
                CROSS JOIN LATERAL unnest(tre.serials) AS s
                GROUP BY tre.token_id, s
            ),
            transfer_dates AS (
                SELECT token_id, serial_number AS serial, MAX(consensus_timestamp) AS ts
                FROM token_transfer_event
                GROUP BY token_id, serial_number
            ),
            nft_retirements AS (
                SELECT COALESCE(rd.ts, td.ts) AS consensus_timestamp, 1::numeric AS amount
                FROM retired_credits rc
                LEFT JOIN retire_dates rd
                    ON rd.token_id = rc.token_id AND rd.serial = rc.serial
                LEFT JOIN transfer_dates td
                    ON td.token_id = rc.token_id AND td.serial = rc.serial
            ),
            fungible_retirements AS (
                SELECT tre.consensus_timestamp,
                       tre.amount / (10::numeric ^ COALESCE(tc.decimals, 0)) AS amount
                FROM token_retire_event tre
                JOIN token_cache tc
                    ON tc."tokenId" = tre.token_id AND tc.type = 'FUNGIBLE_COMMON'
                JOIN sole_project_tokens spt ON spt.token_id = tre.token_id
                WHERE tre.amount IS NOT NULL
            ),
            retirements AS (
                SELECT * FROM nft_retirements
                UNION ALL
                SELECT * FROM fungible_retirements
            )
            -- Consensus timestamps are 'seconds.nanos'; only the seconds part is a date.
            SELECT DATE_TRUNC('month', to_timestamp(split_part(consensus_timestamp, '.', 1)::bigint))::date AS month,
                   SUM(amount)::bigint AS amount
            FROM retirements
            GROUP BY month
            ORDER BY month ASC NULLS LAST`,
            [projectKeys],
        );
    }

    async getAggregations(projectKeys: string[]): Promise<[
        PortfolioProjectTotalRow[],
        PortfolioMonthRow[],
        PortfolioRecentIssuanceRow[],
        PortfolioMonthRow[],
    ]> {
        return Promise.all([
            this.getProjectTotals(projectKeys),
            this.getMonthlySeries(projectKeys),
            this.getRecentIssuances(projectKeys),
            this.getRetirementSeries(projectKeys),
        ]);
    }
}
