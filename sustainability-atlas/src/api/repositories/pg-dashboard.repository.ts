import { DataSource } from 'typeorm';
import { MV_PROJECT_STATS_NAME } from '@shared/materialized-views';

export interface MintAggRow {
    sector: string;
    registry: string;
    month: Date | null;
    amount: string; // Postgres returns BIGINT as string
}

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
    name: string | null;
    lat: string | null;
    lng: string | null;
    credits: string | null;
}

/**
 * Registry display names, resolved once for the whole aggregation.
 *
 * Non-correlated `DISTINCT ON` derived table over the small REGISTRY row set —
 * the same shape used by getMintAggregations and PgProjectRepository, and
 * deliberately not a per-row LATERAL: these aggregates scan every PROJECT row,
 * so a correlated lookup would re-run once per project.
 */
const REGISTRY_NAME_SOURCE = `
    SELECT DISTINCT ON ("registryDid")
           "registryDid",
           "displayName" AS registry_name
    FROM business_view
    WHERE "viewType" = 'REGISTRY'
    ORDER BY "registryDid", "createdAt" DESC NULLS LAST
`;

export class PgDashboardRepository {
    constructor(private readonly dataSource: DataSource) {}

    /**
     * Shared FROM/WHERE for the per-project aggregates.
     *
     * Issued credits come from `mv_project_stats`, falling back to
     * `businessData->>'credits'` for projects the mint linker hasn't
     * attributed — matching what the project list DTO exposes as `credits`.
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
            LEFT JOIN (${REGISTRY_NAME_SOURCE}) reg ON reg."registryDid" = bv."registryDid"
            LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = bv."projectKey"
        `;

        return { from, where: conditions.join(' AND '), params };
    }

    /**
     * Document type per (policy topic, bare schema UUID).
     *
     * policyMapping carries full IRIs of the form `#<uuid>&<version>` while a
     * project's linkedVcs entries carry only the uuid, so the IRI is trimmed to
     * make the two joinable.
     */
    private static readonly SCHEMA_DOC_TYPES_SQL = `
        SELECT DISTINCT
            p."policyTopicId"                                    AS policy_topic_id,
            split_part(ltrim(e->>'schemaIri', '#'), '&', 1)      AS schema_uuid,
            e->>'docType'                                        AS doc_type
        FROM policy p,
             LATERAL jsonb_each(COALESCE(p."policyMapping", '{}'::jsonb)) AS kv(k, v),
             LATERAL jsonb_array_elements(
                 CASE WHEN jsonb_typeof(kv.v) = 'array' THEN kv.v ELSE '[]'::jsonb END
             ) AS e
        WHERE p."decodeStatus" = 'decoded'
          AND e ? 'schemaIri'
          AND e ? 'docType'
    `;

    /** Resolves a per_project row's boolean flags into a lifecycle stage label. */
    private static readonly LIFECYCLE_STAGE_CASE = `
        CASE
            WHEN issued           THEN 'Issued'
            WHEN has_verification THEN 'Verified'
            WHEN has_monitoring   THEN 'Monitoring'
            WHEN has_validation   THEN 'Validation'
            ELSE 'Registered'
        END
    `;

    /** Issued-credit expression shared by every aggregate, so the tiles, country table and breakdowns always agree. */
    private static readonly CREDITS_EXPR = `
        COALESCE(
            ps.total_issued,
            NULLIF(bv."businessData"->>'credits', '')::numeric,
            0
        )
    `;

    /**
     * Deduplicated registry/methodology totals plus the filtered project count.
     *
     * The registry and methodology counts use
     * `COUNT(*) FILTER (key IS NULL) + COUNT(DISTINCT key) FILTER (key IS NOT NULL)`,
     * which reproduces the canonical-row dedup semantics without a correlated
     * subquery. That equivalence holds only because nothing here filters on a
     * row-varying attribute — a filter could match a non-canonical row and the
     * two forms would then disagree, which is why the list endpoints use a
     * `DISTINCT ON` join instead. The registry count applies the same
     * "non-empty registries only" rule as the registries list's hideEmpty.
     */
    async getTotals(query: DashboardMintQuery = {}): Promise<TotalsRow> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                (
                    SELECT (
                        COUNT(*) FILTER (WHERE bv2."registryDid" IS NULL)
                      + COUNT(DISTINCT bv2."registryDid") FILTER (WHERE bv2."registryDid" IS NOT NULL)
                    )::bigint
                    FROM business_view bv2
                    LEFT JOIN mv_registry_stats s ON s."registryDid" = bv2."registryDid"
                    WHERE bv2."viewType" = 'REGISTRY'
                      AND COALESCE(
                            s.policy_count + s.project_count + s.issuance_count + s.user_count, 0
                          ) > 0
                )                                                       AS registries,
                (
                    SELECT (
                        COUNT(*) FILTER (WHERE "relatedTopicId" IS NULL)
                      + COUNT(DISTINCT "relatedTopicId") FILTER (WHERE "relatedTopicId" IS NOT NULL)
                    )::bigint
                    FROM business_view
                    WHERE "viewType" = 'METHODOLOGY'
                )                                                       AS methodologies,
                agg.projects,
                agg.filtered_registries,
                agg.filtered_methodologies
            FROM (
                SELECT
                    COUNT(*)::bigint                                            AS projects,
                    COUNT(DISTINCT reg.registry_name)::bigint                   AS filtered_registries,
                    COUNT(DISTINCT bv."businessData"->>'methodologyId')::bigint AS filtered_methodologies
                FROM ${scope.from}
                WHERE ${scope.where}
            ) agg
        `;

        const rows: TotalsRow[] = await this.dataSource.query(sql, scope.params);
        return rows[0] ?? {
            registries: '0',
            methodologies: '0',
            projects: '0',
            filtered_registries: '0',
            filtered_methodologies: '0',
        };
    }

    /**
     * Distinct developer / registry labels for the dashboard's filter dropdowns.
     *
     * Ignores the active filters: the dropdowns must keep offering every
     * option, otherwise selecting a developer would collapse the list to that
     * one value and strand the user.
     */
    async getFilterOptions(): Promise<FilterOptionsRow> {
        const sql = `
            SELECT
                ARRAY_AGG(DISTINCT developer) FILTER (WHERE developer <> '')       AS developers,
                ARRAY_AGG(DISTINCT registry_name) FILTER (WHERE registry_name <> '') AS registries
            FROM (
                SELECT
                    COALESCE(bv."businessData"->>'developer', '') AS developer,
                    COALESCE(reg.registry_name, '')               AS registry_name
                FROM business_view bv
                LEFT JOIN (${REGISTRY_NAME_SOURCE}) reg ON reg."registryDid" = bv."registryDid"
                WHERE bv."viewType" = 'PROJECT'
            ) opts
        `;

        const rows: FilterOptionsRow[] = await this.dataSource.query(sql);
        return rows[0] ?? { developers: [], registries: [] };
    }

    /** Per-country project/credit/methodology counts in one GROUP BY. Raw country strings are returned as stored — the client owns ISO-code mapping and "Unknown" bucketing. */
    async getCountryAggregates(query: DashboardMintQuery = {}): Promise<CountryAggRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                bv."businessData"->>'country'                                  AS country,
                COUNT(*)::bigint                                               AS projects,
                COALESCE(SUM(${PgDashboardRepository.CREDITS_EXPR}), 0)::bigint AS credits,
                COUNT(DISTINCT bv."businessData"->>'methodologyId')::bigint    AS methodologies,
                MIN(bv."businessData"->>'developer')                           AS developer,
                MIN(reg.registry_name)                                         AS registry
            FROM ${scope.from}
            WHERE ${scope.where}
            GROUP BY bv."businessData"->>'country'
            ORDER BY projects DESC
        `;

        return this.dataSource.query(sql, scope.params);
    }

    /** Project counts grouped by an arbitrary label expression (registry name, sector, vintage). */
    private async getLabelAggregates(
        labelSql: string,
        query: DashboardMintQuery,
    ): Promise<LabelAggRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                ${labelSql}                                                    AS label,
                COUNT(*)::bigint                                               AS projects,
                COALESCE(SUM(${PgDashboardRepository.CREDITS_EXPR}), 0)::bigint AS credits,
                COUNT(DISTINCT bv."businessData"->>'methodologyId')::bigint    AS methodologies
            FROM ${scope.from}
            WHERE ${scope.where}
            GROUP BY ${labelSql}
            ORDER BY projects DESC
        `;

        return this.dataSource.query(sql, scope.params);
    }

    getRegistryAggregates(query: DashboardMintQuery = {}): Promise<LabelAggRow[]> {
        return this.getLabelAggregates('reg.registry_name', query);
    }

    getSectorAggregates(query: DashboardMintQuery = {}): Promise<LabelAggRow[]> {
        return this.getLabelAggregates(`bv."businessData"->>'sector'`, query);
    }

    getVintageAggregates(query: DashboardMintQuery = {}): Promise<LabelAggRow[]> {
        return this.getLabelAggregates(`bv."businessData"->>'vintage'`, query);
    }

    getStatusAggregates(query: DashboardMintQuery = {}): Promise<LabelAggRow[]> {
        return this.getLabelAggregates(`bv."businessData"->>'status'`, query);
    }

    /**
     * Projects grouped by derived lifecycle stage:
     * Registered -> Validation -> Monitoring -> Verified -> Issued.
     *
     * Mirrors ProjectResponseDto.fromRow's derivation. A stage counts only when
     * the project actually holds a VC of that document type — schemas the policy
     * defines but the project never submitted must not advance it. Document
     * types come from `policy.policyMapping`, matched to the project's
     * `linkedVcs` on the bare schema UUID (policyMapping carries full IRIs of
     * the form `#<uuid>&<version>`, linkedVcs carries just the uuid).
     */
    async getLifecycleStageAggregates(query: DashboardMintQuery = {}): Promise<LabelAggRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            WITH schema_doc_types AS (${PgDashboardRepository.SCHEMA_DOC_TYPES_SQL}),
            per_project AS (
                SELECT
                    bv.id                                                        AS row_id,
                    COALESCE(ps.total_issued, 0) > 0
                        OR COALESCE(ps.issuance_count, 0) > 0                    AS issued,
                    bool_or(sdt.doc_type = 'verificationReport')                 AS has_verification,
                    bool_or(sdt.doc_type = 'monitoringReport')                   AS has_monitoring,
                    bool_or(sdt.doc_type = 'validationReport')                   AS has_validation,
                    MAX(${PgDashboardRepository.CREDITS_EXPR})                   AS credits,
                    MAX(bv."businessData"->>'methodologyId')                     AS methodology_id
                FROM ${scope.from}
                LEFT JOIN LATERAL jsonb_array_elements(
                    COALESCE(bv."businessData"->'linkedVcs', '[]'::jsonb)
                ) AS lv ON true
                LEFT JOIN schema_doc_types sdt
                    ON sdt.policy_topic_id = bv."businessData"->>'policyTopicId'
                   AND sdt.schema_uuid     = lv->>'schemaUuid'
                WHERE ${scope.where}
                GROUP BY bv.id, ps.total_issued, ps.issuance_count
            )
            SELECT
                ${PgDashboardRepository.LIFECYCLE_STAGE_CASE}    AS label,
                COUNT(*)::bigint                                 AS projects,
                COALESCE(SUM(credits), 0)::bigint                AS credits,
                COUNT(DISTINCT methodology_id)::bigint           AS methodologies
            FROM per_project
            GROUP BY label
        `;

        return this.dataSource.query(sql, scope.params);
    }

    getMethodologyAggregates(query: DashboardMintQuery = {}): Promise<LabelAggRow[]> {
        return this.getLabelAggregates(`bv."businessData"->>'methodology'`, query);
    }

    /**
     * Portfolio-level metrics for the analytics page: lifecycle volumes plus the
     * two averages it derives (vintage year, crediting-period length).
     *
     * Computed in one pass in Postgres. The vintage/crediting-period guards
     * mirror the client-side ones exactly — vintage restricted to 2000..2030,
     * crediting periods only counted when both ends parse and end > start —
     * so the displayed averages are unchanged.
     */
    async getPortfolioMetrics(query: DashboardMintQuery = {}): Promise<PortfolioMetricsRow> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                COALESCE(SUM(ps.total_issued), 0)::bigint                        AS total_issued,
                COALESCE(SUM(ps.total_retired), 0)::bigint                       AS total_retired,
                COALESCE(SUM(ps.total_issued) - SUM(ps.total_retired), 0)::bigint AS total_active,
                AVG(
                    CASE
                        WHEN (bv."businessData"->>'vintage') ~ '^[0-9]{4}$'
                         AND (bv."businessData"->>'vintage')::int BETWEEN 2000 AND 2030
                        THEN (bv."businessData"->>'vintage')::int
                    END
                )                                                                AS avg_vintage_year,
                AVG(
                    CASE
                        WHEN cp.start_ts IS NOT NULL
                         AND cp.end_ts   IS NOT NULL
                         AND cp.end_ts > cp.start_ts
                        THEN EXTRACT(EPOCH FROM (cp.end_ts - cp.start_ts)) / (60 * 60 * 24 * 365.25)
                    END
                )                                                                AS avg_crediting_period_years
            FROM ${scope.from}
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

        const rows: PortfolioMetricsRow[] = await this.dataSource.query(sql, scope.params);
        return rows[0] ?? {
            total_issued: '0',
            total_retired: '0',
            total_active: '0',
            avg_vintage_year: null,
            avg_crediting_period_years: null,
        };
    }

    /**
     * (country, label) buckets for the country detail panel's donuts.
     *
     * Grouped server-side so clicking a country needs no extra round trip and
     * no per-project data on the client. Bounded by
     * distinct(country) x distinct(label), which stays small.
     */
    private async getCountryBreakdown(
        labelSql: string,
        query: DashboardMintQuery,
    ): Promise<CountryBreakdownRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                bv."businessData"->>'country'                                  AS country,
                ${labelSql}                                                    AS label,
                COUNT(*)::bigint                                               AS projects,
                COALESCE(SUM(${PgDashboardRepository.CREDITS_EXPR}), 0)::bigint AS credits
            FROM ${scope.from}
            WHERE ${scope.where}
            GROUP BY bv."businessData"->>'country', ${labelSql}
        `;

        return this.dataSource.query(sql, scope.params);
    }

    /**
     * Developer leaderboard: per-developer project/credit volume plus the
     * distinct country and sector counts the analytics table shows.
     *
     * The distinct counts are why this needs its own query rather than reusing
     * getLabelAggregates — COUNT(DISTINCT) over two extra dimensions can't be
     * derived from a per-developer row on the client without shipping every
     * project.
     */
    async getDeveloperAggregates(query: DashboardMintQuery = {}): Promise<DeveloperAggRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                bv."businessData"->>'developer'                                 AS label,
                COUNT(*)::bigint                                               AS projects,
                COALESCE(SUM(${PgDashboardRepository.CREDITS_EXPR}), 0)::bigint AS credits,
                COUNT(DISTINCT NULLIF(bv."businessData"->>'country', ''))::bigint AS country_count,
                COUNT(DISTINCT NULLIF(bv."businessData"->>'sector', ''))::bigint  AS sector_count
            FROM ${scope.from}
            WHERE ${scope.where}
            GROUP BY bv."businessData"->>'developer'
            ORDER BY credits DESC
        `;

        return this.dataSource.query(sql, scope.params);
    }

    /** (registry, lifecycle stage) cross-tab for the analytics registry throughput heatmap. */
    async getRegistryStatusBreakdown(query: DashboardMintQuery = {}): Promise<RegistryStatusRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            WITH schema_doc_types AS (${PgDashboardRepository.SCHEMA_DOC_TYPES_SQL}),
            per_project AS (
                SELECT
                    bv.id                                                        AS row_id,
                    MAX(reg.registry_name)                                       AS registry,
                    COALESCE(ps.total_issued, 0) > 0
                        OR COALESCE(ps.issuance_count, 0) > 0                    AS issued,
                    bool_or(sdt.doc_type = 'verificationReport')                 AS has_verification,
                    bool_or(sdt.doc_type = 'monitoringReport')                   AS has_monitoring,
                    bool_or(sdt.doc_type = 'validationReport')                   AS has_validation
                FROM ${scope.from}
                LEFT JOIN LATERAL jsonb_array_elements(
                    COALESCE(bv."businessData"->'linkedVcs', '[]'::jsonb)
                ) AS lv ON true
                LEFT JOIN schema_doc_types sdt
                    ON sdt.policy_topic_id = bv."businessData"->>'policyTopicId'
                   AND sdt.schema_uuid     = lv->>'schemaUuid'
                WHERE ${scope.where}
                GROUP BY bv.id, ps.total_issued, ps.issuance_count
            )
            SELECT
                registry,
                ${PgDashboardRepository.LIFECYCLE_STAGE_CASE} AS status,
                COUNT(*)::bigint                              AS projects
            FROM per_project
            GROUP BY registry, status
        `;

        return this.dataSource.query(sql, scope.params);
    }

    getCountrySectorBreakdown(query: DashboardMintQuery = {}): Promise<CountryBreakdownRow[]> {
        // The detail panel's donut buckets by `category`, not `sector`.
        return this.getCountryBreakdown(`bv."businessData"->>'category'`, query);
    }

    getCountryRegistryBreakdown(query: DashboardMintQuery = {}): Promise<CountryBreakdownRow[]> {
        return this.getCountryBreakdown('reg.registry_name', query);
    }

    /**
     * Map markers for projects that carry coordinates.
     *
     * Filtered to rows that actually have lat/lng, so this returns nothing at
     * all for datasets without geo data instead of streaming every project —
     * which is what the old client-side `fetchAll` + filter did.
     */
    async getMapPoints(query: DashboardMintQuery = {}): Promise<MapPointRow[]> {
        const scope = this.buildProjectScope(query);

        const sql = `
            SELECT
                bv."displayName"                                    AS name,
                bv."businessData"->>'lat'                           AS lat,
                bv."businessData"->>'lng'                           AS lng,
                ${PgDashboardRepository.CREDITS_EXPR}::bigint       AS credits
            FROM ${scope.from}
            WHERE ${scope.where}
              AND (bv."businessData"->>'lat') IS NOT NULL
              AND (bv."businessData"->>'lng') IS NOT NULL
        `;

        return this.dataSource.query(sql, scope.params);
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
            LEFT JOIN (
                SELECT DISTINCT ON ("registryDid")
                       "registryDid",
                       "displayName" AS registry_name
                FROM business_view
                WHERE "viewType" = 'REGISTRY'
                ORDER BY "registryDid", "createdAt" DESC NULLS LAST
            ) reg ON reg."registryDid" = bv."registryDid"
            WHERE ${where}
            GROUP BY sector, registry, month
            ORDER BY month ASC NULLS LAST
        `;

        return this.dataSource.query(sql, params);
    }
}
