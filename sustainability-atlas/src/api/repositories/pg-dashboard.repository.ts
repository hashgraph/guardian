import { DataSource } from 'typeorm';
import { MV_PROJECT_STATS_NAME, MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';

export interface MintAggRow {
    sector: string;
    registry: string;
    month: Date | null;
    amount: string; // Postgres returns BIGINT as string
}

/**
 * Retirement volume by month, from Guardian's retirement contracts.
 *
 * Only documented retirements carry a date. Credits destroyed without going
 * through the contract are visible on the ledger but carry no record of when,
 * so they cannot be placed on a time axis and are absent here by necessity —
 * this series is a floor on retirement volume, not the whole of it.
 */
export type RetirementAggRow = MintAggRow;

export interface DashboardMintQuery {
    registry?: string;
    developer?: string;
    registryDid?: string;
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
 *  - Registry display names are resolved via a non-correlated `DISTINCT ON`
 *    derived table (computed once, over the small ~dozens-of-rows REGISTRY
 *    set) instead of a per-row LATERAL subquery — cost stays flat regardless
 *    of how many project_mint_link rows are being aggregated.
 *  - No per-project loop; the DB engine handles the aggregation in one plan.
 *  - We filter pml.amount > 0 and pml.token_id IS NOT NULL early so the
 *    aggregation only touches real mint rows.
 */
export interface CountryAggRow {
    country: string | null;
    projects: string;
    credits: string;
    methodologies: string;
    developer: string | null;
    registry: string | null;
}

export interface LabelAggRow {
    label: string | null;
    projects: string;
    credits: string;
    methodologies: string;
}

export interface TotalsRow {
    registries: string;
    methodologies: string;
    projects: string;
    /** Distinct registries/methodologies WITHIN the filtered project set — what the stat cards show while a filter is active. */
    filtered_registries: string;
    filtered_methodologies: string;
}

export interface FilterOptionsRow {
    developers: string[] | null;
    registries: string[] | null;
}

/** One developer's leaderboard row, including the distinct-dimension counts shown in the table. */
export interface DeveloperAggRow {
    label: string | null;
    projects: string;
    credits: string;
    country_count: string;
    sector_count: string;
}

/** One (registry, status) cell of the analytics throughput cross-tab. */
export interface RegistryStatusRow {
    registry: string | null;
    status: string | null;
    projects: string;
}

/** Portfolio-level lifecycle volumes and derived averages for the analytics page. */
export interface PortfolioMetricsRow {
    total_issued: string;
    total_retired: string;
    total_active: string;
    avg_vintage_year: string | null;
    avg_crediting_period_years: string | null;
}

/** One (country, label) bucket backing the country detail panel's sector / registry donuts. */
export interface CountryBreakdownRow {
    country: string | null;
    label: string | null;
    projects: string;
    credits: string;
}

export interface MapPointRow {
    projectKey: string;
    name: string | null;
    country: string | null;
    lat: string | null;
    lng: string | null;
    credits: string | null;
}

/**
 * One row per PROJECT in scope, carrying every column the dashboard's 12
 * per-project breakdowns (country/sector/vintage/status/developer/
 * methodology/lifecycle/map/portfolio) need. Fetched once and aggregated in
 * Node (see dashboard-aggregation.util.ts) instead of issuing one GROUP BY
 * query per breakdown — at 363 PROJECT rows, re-scanning/re-sorting the same
 * scope 12 times cost more than the single fetch + in-memory grouping does.
 */
export interface ProjectScopeRow {
    projectKey: string;
    displayName: string | null;
    country: string | null;
    sector: string | null;
    vintage: string | null;
    status: string | null;
    developer: string | null;
    methodology: string | null;
    methodologyId: string | null;
    category: string | null;
    registryName: string | null;
    lifecycleStage: string;
    /** MIN(developer)/MIN(registryName) within this row's country, computed by Postgres via a window function so the country table's representative label matches the database's actual text collation. */
    countryMinDeveloper: string | null;
    countryMinRegistry: string | null;
    credits: string; // bigint as string
    totalIssued: string; // bigint as string
    totalRetired: string; // bigint as string
    lat: string | null;
    lng: string | null;
    /** ISO 3166-1 alpha-3 code from ReverseGeoService, written at ingest when `country` couldn't be resolved from the VC's own fields but coordinates were available — see project-mapper.service.ts. Node-side fallback for rows whose `country` is blank/unrecognized (see resolveScopeRowCountries in dashboard-aggregation.util.ts). */
    geoCountryCode: string | null;
    /** Pre-validated in SQL (regex + 2000..2030 range) so Node only ever averages already-valid years. */
    vintageYear: number | null;
    /** Pre-computed in SQL (same date-parsing/guard logic getPortfolioMetrics used) so Node only ever averages already-valid durations. */
    creditingPeriodYears: number | null;
}

/** Dropdown options and the two registry/methodology totals — both filter-independent, so cached and fetched separately from the per-project scope. */
export interface GlobalDashboardStatsRow {
    developers: string[] | null;
    registries: string[] | null;
    totalRegistries: string;
    totalMethodologies: string;
}

export class PgDashboardRepository {
    constructor(private readonly dataSource: DataSource) {}

    /**
     * Shared FROM/WHERE for the per-project aggregates.
     *
     * Issued credits come strictly from `mv_project_stats` (actual on-chain minted
     * credits) to maintain consistency with the portfolio totalIssued KPI.
     */
    private buildProjectScope(query: DashboardMintQuery): { from: string; where: string; params: unknown[] } {
        const params: unknown[] = [];
        const conditions: string[] = [`bv."viewType" = 'PROJECT'`];

        if (query.registry) {
            params.push(query.registry);
            conditions.push(`reg.registry_name = $${params.length}`);
        }
        if (query.developer) {
            params.push(query.developer);
            conditions.push(`bv."businessData"->>'developer' = $${params.length}`);
        }
        if (query.registryDid) {
            params.push(query.registryDid);
            conditions.push(`bv."registryDid" = $${params.length}`);
        }

        const from = `
            business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg ON reg."registryDid" = bv."registryDid"
            LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = bv."projectKey"
        `;

        return { from, where: conditions.join(' AND '), params };
    }

    /** Issued-credit expression shared by every aggregate, so the tiles, country table and breakdowns always agree. */
    private static readonly CREDITS_EXPR = `
        COALESCE(ps.total_issued, 0)
    `;

    /**
     * Single fetch of every column the dashboard's 12 per-project breakdowns
     * (country/registry/sector/vintage/status/developer/methodology/
     * lifecycle/country×sector/country×registry/map/portfolio) need, scoped
     * exactly like the old per-breakdown queries via buildProjectScope.
     *
     * Replaces what used to be 12 separate GROUP BY queries against this same
     * 363-row (PROJECT-scoped) FROM clause — each one re-scanning/re-sorting
     * identical rows just to group them differently. At this row count,
     * fetching once and aggregating in Node (dashboard-aggregation.util.ts)
     * eliminates that repeated work; see docs/performance-audit-SE.md §4.6.
     *
     * vintageYear / creditingPeriodYears are pre-validated/pre-computed here
     * (same regex + range guards getPortfolioMetrics used to apply in SQL) so
     * the Node aggregation only ever needs to AVG already-valid numbers, never
     * re-implement date/regex parsing.
     */
    async getProjectScopeRows(query: DashboardMintQuery = {}): Promise<ProjectScopeRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                bv."projectKey"                                                 AS "projectKey",
                bv."displayName"                                                AS "displayName",
                bv."businessData"->>'country'                                   AS country,
                bv."businessData"->>'sector'                                    AS sector,
                bv."businessData"->>'vintage'                                   AS vintage,
                bv."businessData"->>'status'                                    AS status,
                bv."businessData"->>'developer'                                 AS developer,
                bv."businessData"->>'methodology'                               AS methodology,
                bv."businessData"->>'methodologyId'                             AS "methodologyId",
                bv."businessData"->>'category'                                  AS category,
                reg.registry_name                                               AS "registryName",
                COALESCE(ml.lifecycle_stage, 'Registered')                      AS "lifecycleStage",
                -- Computed by Postgres (not re-derived in Node) so the country
                -- table's representative developer/registry label uses the
                -- database's actual text collation, not an approximation of it.
                MIN(bv."businessData"->>'developer') OVER (PARTITION BY bv."businessData"->>'country') AS "countryMinDeveloper",
                MIN(reg.registry_name) OVER (PARTITION BY bv."businessData"->>'country')                AS "countryMinRegistry",
                ${PgDashboardRepository.CREDITS_EXPR}::bigint                   AS credits,
                COALESCE(ps.total_issued, 0)::bigint                            AS "totalIssued",
                COALESCE(ps.total_retired, 0)::bigint                           AS "totalRetired",
                bv."businessData"->>'lat'                                       AS lat,
                bv."businessData"->>'lng'                                       AS lng,
                bv."businessData"->>'geoCountryCode'                            AS "geoCountryCode",
                CASE
                    WHEN (bv."businessData"->>'vintage') ~ '^[0-9]{4}$'
                     AND (bv."businessData"->>'vintage')::int BETWEEN 2000 AND 2030
                    THEN (bv."businessData"->>'vintage')::int
                END                                                              AS "vintageYear",
                CASE
                    WHEN cp.start_ts IS NOT NULL
                     AND cp.end_ts   IS NOT NULL
                     AND cp.end_ts > cp.start_ts
                    THEN (EXTRACT(EPOCH FROM (cp.end_ts - cp.start_ts)) / (60 * 60 * 24 * 365.25))::double precision
                END                                                              AS "creditingPeriodYears"
            FROM ${scope.from}
            LEFT JOIN mv_project_lifecycle ml ON ml."projectKey" = bv."projectKey"
            LEFT JOIN LATERAL (
                -- Dates arrive as free-form strings; a bad value must skip the
                -- row, not abort the whole aggregate, so parse defensively.
                SELECT
                    CASE WHEN (bv."businessData"->>'creditingPeriodStart') ~ '^\\d{4}-\\d{2}-\\d{2}'
                         THEN (left(bv."businessData"->>'creditingPeriodStart', 10))::timestamptz END AS start_ts,
                    CASE WHEN (bv."businessData"->>'creditingPeriodEnd') ~ '^\\d{4}-\\d{2}-\\d{2}'
                         THEN (left(bv."businessData"->>'creditingPeriodEnd', 10))::timestamptz END   AS end_ts
            ) cp ON true
            WHERE ${scope.where}
        `;

        return this.dataSource.query(sql, scope.params);
    }

    /**
     * Filter-dropdown options plus the two registry/methodology totals that
     * used to live inside getTotals's outer SELECT — both are independent of
     * `query` (dropdowns must keep offering every option regardless of the
     * active filter, and the two totals are unfiltered by construction in the
     * original SQL too), so they're fetched once here rather than recomputed
     * per filter combination.
     */
    async getGlobalDashboardStats(): Promise<GlobalDashboardStatsRow> {
        const sql = `
            SELECT
                -- FILTER-ing out every row leaves ARRAY_AGG NULL rather than {} —
                -- COALESCE keeps this an empty array like every other caller expects.
                COALESCE(ARRAY_AGG(DISTINCT developer) FILTER (WHERE developer <> ''), ARRAY[]::text[])       AS developers,
                COALESCE(ARRAY_AGG(DISTINCT registry_name) FILTER (WHERE registry_name <> ''), ARRAY[]::text[]) AS registries,
                (
                    -- mv_registry_stats is already one row per registryDid (canonical),
                    -- so this reads the count directly instead of deduplicating the raw
                    -- REGISTRY population in business_view on every call.
                    SELECT COUNT(*)::bigint
                    FROM mv_registry_stats
                    WHERE COALESCE(policy_count, 0) + COALESCE(project_count, 0)
                        + COALESCE(issuance_count, 0) + COALESCE(user_count, 0) > 0
                )                                                                  AS "totalRegistries",
                (
                    -- mv_methodology_stats is keyed by relatedTopicId (WHERE relatedTopicId
                    -- IS NOT NULL), so it already equals COUNT(DISTINCT relatedTopicId);
                    -- only the relatedTopicId IS NULL standalone rows still need a scan.
                    (SELECT COUNT(*)::bigint FROM business_view
                     WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NULL)
                  + (SELECT COUNT(*)::bigint FROM mv_methodology_stats)
                )                                                                  AS "totalMethodologies"
            FROM (
                SELECT
                    COALESCE(bv."businessData"->>'developer', '') AS developer,
                    COALESCE(reg.registry_name, '')               AS registry_name
                FROM business_view bv
                LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg ON reg."registryDid" = bv."registryDid"
                WHERE bv."viewType" = 'PROJECT'
            ) opts
        `;

        const rows: GlobalDashboardStatsRow[] = await this.dataSource.query(sql);
        return rows[0] ?? { developers: [], registries: [], totalRegistries: '0', totalMethodologies: '0' };
    }

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
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg ON reg."registryDid" = bv."registryDid"
            WHERE ${where}
            GROUP BY sector, registry, month
            ORDER BY month ASC NULLS LAST
        `;

        return this.dataSource.query(sql, params);
    }

    /**
     * Dated retirement volume, grouped the same way as {@link getMintAggregations}
     * so the two series can be filtered and bucketed identically.
     *
     * Counts only credits provably minted through Guardian — the same rule
     * mv_project_stats.total_retired uses, so the chart and the stat cards agree:
     *
     * 1. Non-fungible: by serial, through the issuance that minted it. A retired
     *    serial matching no mint link is dropped; nothing ties it to a policy, so
     *    it is not provably an issuance rather than a direct on-chain mint.
     * 2. Fungible: by token, from Guardian's RETIRE contract events, and only
     *    where that token belongs to a single project. Fungible units are
     *    interchangeable, so no finer grain exists — but the contract event is
     *    itself proof the retirement happened under Guardian.
     *
     * Each credit is then dated documented-first, the same precedence the credit
     * lifecycle uses: the retirement contract's timestamp where one exists, and
     * otherwise the credit's last movement — the point at which it left
     * circulation. Without that fallback the chart would omit credits the
     * retired totals include, and the two would disagree for no reason a reader
     * could see.
     */
    async getRetirementAggregations(query: DashboardMintQuery = {}): Promise<RetirementAggRow[]> {
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (query.registry) {
            params.push(query.registry);
            conditions.push(`reg.registry_name = $${params.length}`);
        }

        if (query.developer) {
            params.push(query.developer);
            conditions.push(`bv."businessData"->>'developer' = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            WITH sole_project_tokens AS (
                SELECT token_id, MIN(project_key) AS project_key
                FROM project_mint_link
                WHERE token_id IS NOT NULL
                GROUP BY token_id
                HAVING COUNT(DISTINCT project_key) = 1
            ),
            mint_project AS (
                -- Collapsed to one project per (token, mint VP) so a serial
                -- cannot match two mint links and be counted twice.
                SELECT token_id, vp_consensus_timestamp, MIN(project_key) AS project_key
                FROM project_mint_link
                WHERE token_id IS NOT NULL AND vp_consensus_timestamp IS NOT NULL
                GROUP BY token_id, vp_consensus_timestamp
            ),
            retired_credits AS (
                -- Credits the ledger shows destroyed AND that a Guardian mint
                -- event claims. Serials matching no mint link are dropped — they
                -- are not provably Guardian issuances, and every retirement
                -- figure in the product is now defined as provably-Guardian only;
                -- the join is inner for exactly that reason. Backed by the
                -- partial index on deleted serials — the alternative is a scan
                -- of every serial ever minted.
                SELECT n."tokenId" AS token_id,
                       n."serialNumber" AS serial,
                       mp.project_key AS project_key
                FROM nft_cache n
                JOIN mint_project mp
                    ON mp.token_id = n."tokenId"
                   AND mp.vp_consensus_timestamp = n."metadataTimestamp"
                WHERE n.deleted
            ),
            -- Both date sets are built once and hash-joined. Asking per credit
            -- instead turns a few thousand rows into a subquery per serial.
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
                SELECT COALESCE(rd.ts, td.ts) AS consensus_timestamp,
                       rc.project_key,
                       1::numeric AS amount
                FROM retired_credits rc
                LEFT JOIN retire_dates rd
                    ON rd.token_id = rc.token_id AND rd.serial = rc.serial
                LEFT JOIN transfer_dates td
                    ON td.token_id = rc.token_id AND td.serial = rc.serial
                WHERE rc.project_key IS NOT NULL
            ),
            fungible_retirements AS (
                SELECT tre.consensus_timestamp, spt.project_key,
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
            SELECT
                COALESCE(bv."businessData"->>'sector', '')                   AS sector,
                COALESCE(reg.registry_name, bv."registryDid", 'Unknown')     AS registry,
                -- Consensus timestamps are 'seconds.nanos'; only the seconds
                -- part is a date.
                DATE_TRUNC('month', to_timestamp(split_part(r.consensus_timestamp, '.', 1)::bigint))::date AS month,
                SUM(r.amount)::bigint                                        AS amount
            FROM retirements r
            JOIN business_view bv
                ON bv."projectKey" = r.project_key
               AND bv."viewType" = 'PROJECT'
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg ON reg."registryDid" = bv."registryDid"
            ${where}
            GROUP BY sector, registry, month
            ORDER BY month ASC NULLS LAST
        `;

        return this.dataSource.query(sql, params);
    }
}
