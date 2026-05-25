import { DataSource } from 'typeorm';

export interface MintAggRow {
    sector: string;
    registry: string;
    month: Date | null;
    amount: string; // Postgres returns BIGINT as string
}

export interface DashboardMintQuery {
    registry?: string;
    developer?: string;
}

/**
 * Single aggregation query against project_mint_link JOIN business_view.
 *
 * Groups by (sector, registry, month) in one pass — the caller pivots the
 * result into totalMinted / mintSeries / bySector / byRegistry without any
 * extra round trips.
 *
 * Performance notes:
 *  - project_mint_link.project_key has idx_pml_project_key —
 *    the JOIN to business_view hits that index.
 *  - The LATERAL registry lookup is O(log n) per row.
 *  - No per-project loop; the DB engine handles the aggregation in one plan.
 *  - We filter pml.amount > 0 and pml.token_id IS NOT NULL early so the
 *    aggregation only touches real mint rows.
 */
export class PgDashboardRepository {
    constructor(private readonly dataSource: DataSource) {}

    async getMintAggregations(query: DashboardMintQuery = {}): Promise<MintAggRow[]> {
        const params: unknown[] = [];

        const conditions: string[] = [
            `pml.token_id IS NOT NULL`,
            `pml.amount IS NOT NULL`,
            `pml.amount > 0`,
        ];

        if (query.registry) {
            params.push(query.registry);
            conditions.push(`reg.registry_name = $${params.length}`);
        }

        if (query.developer) {
            params.push(query.developer);
            conditions.push(`bv."businessData"->>'developer' = $${params.length}`);
        }

        const where = conditions.join(' AND ');

        const sql = `
            SELECT
                COALESCE(bv."businessData"->>'sector', '')                   AS sector,
                COALESCE(reg.registry_name, bv."registryDid", 'Unknown')     AS registry,
                DATE_TRUNC('month', pml.mint_date)::date                     AS month,
                SUM(pml.amount)::bigint                                      AS amount
            FROM project_mint_link pml
            JOIN business_view bv
                ON bv."projectKey" = pml.project_key
               AND bv."viewType" = 'PROJECT'
            LEFT JOIN LATERAL (
                SELECT "displayName" AS registry_name
                FROM business_view r
                WHERE r."viewType" = 'REGISTRY'
                  AND r."registryDid" = bv."registryDid"
                ORDER BY r."createdAt" DESC NULLS LAST
                LIMIT 1
            ) reg ON true
            WHERE ${where}
            GROUP BY sector, registry, month
            ORDER BY month ASC NULLS LAST
        `;

        return this.dataSource.query(sql, params);
    }
}
