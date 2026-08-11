import { DataSource } from 'typeorm';
import { MV_PROJECT_STATS_NAME } from '@shared/materialized-views';
import {
    DeveloperRepository,
    DeveloperListQuery,
    DeveloperListResult,
    DeveloperRow,
} from './developer.repository';

interface RawRow {
    developer: string;
    project_count: string;
    country_count: string;
    top_country: string | null;
    registries: string[] | null;
    categories: string[] | null;
    total_issued: string;
    total_retired: string;
}

const SORTABLE_COLUMNS: Record<string, string> = {
    name: 'developer',
    projects: 'project_count',
    countries: 'country_count',
    totalIssued: 'total_issued',
    totalRetired: 'total_retired',
    country: 'top_country',
};

/**
 * PostgreSQL implementation of the DeveloperRepository.
 *
 * Strategy: one aggregation pass over PROJECT rows grouped by
 * businessData->>'developer'. Issuance figures fold in project_mint_link
 * (totalIssued) and nft_cache (totalRetired) per developer. Search / filter
 * / sort are applied on the aggregated result inside a single statement so
 * pagination remains correct.
 */
export class PgDeveloperRepository extends DeveloperRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: DeveloperListQuery): Promise<DeveloperListResult> {
        const { page, limit, search, sortBy, sortDir, country } = query;
        const offset = (page - 1) * limit;

        const params: unknown[] = [];
        const pushParam = (v: unknown): string => {
            params.push(v);
            return `$${params.length}`;
        };

        const filters: string[] = [];
        if (search) {
            const like = pushParam(`%${search.trim()}%`);
            filters.push(`(developer ILIKE ${like} OR top_country ILIKE ${like})`);
        }
        if (country) {
            const like = pushParam(`%${country.trim()}%`);
            filters.push(`top_country ILIKE ${like}`);
        }
        const havingClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const sortColumn = sortBy && SORTABLE_COLUMNS[sortBy]
            ? SORTABLE_COLUMNS[sortBy]
            : 'project_count';
        const direction = sortDir === 'asc' ? 'ASC' : 'DESC';
        // Qualified with `agg.` deliberately. The SELECT below re-emits the
        // numeric aggregates as ::text under the same names, and an unqualified
        // ORDER BY binds to that text output column — sorting 50000 before 5.
        // A qualified reference can't match an output alias, so it binds to the
        // numeric input instead.
        //
        // Nulls always last so empty-country / empty-issuance rows don't pin
        // themselves to the top when sorted ascending.
        const orderBy = `agg.${sortColumn} ${direction} NULLS LAST, agg.developer ASC`;

        // Issued/retired totals come from mv_project_stats, keyed by projectKey
        // and refreshed by MvRefreshProcessor. Its retired figure counts each
        // (project, token) pair once and only for NON_FUNGIBLE_UNIQUE tokens.
        const baseCte = `
            WITH dev_projects AS (
                SELECT
                    bv."projectKey"                       AS source_ts,
                    bv."businessData"->>'developer'       AS developer,
                    bv."businessData"->>'country'         AS country,
                    bv."businessData"->>'category'        AS category,
                    reg.registry_name                     AS registry_name
                FROM business_view bv
                LEFT JOIN (
                    SELECT DISTINCT ON ("registryDid")
                           "registryDid",
                           "displayName" AS registry_name
                    FROM business_view
                    WHERE "viewType" = 'REGISTRY'
                    ORDER BY "registryDid", "createdAt" DESC NULLS LAST
                ) reg ON reg."registryDid" = bv."registryDid"
                WHERE bv."viewType" = 'PROJECT'
                  AND bv."businessData"->>'developer' IS NOT NULL
                  AND bv."businessData"->>'developer' <> ''
            ),
            project_stats AS (
                SELECT
                    "projectKey"              AS source_ts,
                    total_issued::numeric     AS issued,
                    total_retired::numeric    AS retired
                FROM ${MV_PROJECT_STATS_NAME}
            ),
            agg AS (
                SELECT
                    dp.developer,
                    COUNT(DISTINCT dp.source_ts)::int AS project_count,
                    COUNT(DISTINCT NULLIF(dp.country, ''))::int AS country_count,
                    mode() WITHIN GROUP (ORDER BY NULLIF(dp.country, '')) AS top_country,
                    ARRAY_AGG(DISTINCT dp.registry_name)
                        FILTER (WHERE dp.registry_name IS NOT NULL AND dp.registry_name <> '')
                        AS registries,
                    ARRAY_AGG(DISTINCT dp.category)
                        FILTER (WHERE dp.category IS NOT NULL AND dp.category <> '')
                        AS categories,
                    COALESCE(SUM(ps.issued), 0)::numeric  AS total_issued,
                    COALESCE(SUM(ps.retired), 0)::numeric AS total_retired
                FROM dev_projects dp
                LEFT JOIN project_stats ps ON ps.source_ts = dp.source_ts
                GROUP BY dp.developer
            )
        `;

        const rowsSql = `
            ${baseCte}
            SELECT
                developer,
                project_count::text  AS project_count,
                country_count::text  AS country_count,
                top_country,
                registries,
                categories,
                total_issued::text   AS total_issued,
                total_retired::text  AS total_retired
            FROM agg
            ${havingClause}
            ORDER BY ${orderBy}
            LIMIT ${pushParam(limit)} OFFSET ${pushParam(offset)}
        `;

        // Count query reuses the same params except limit/offset (last two).
        const countParams = params.slice(0, params.length - 2);
        const countSql = `
            ${baseCte}
            SELECT COUNT(*)::int AS total
            FROM agg
            ${havingClause}
        `;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, params),
            this.dataSource.query(countSql, countParams),
        ]);

        return {
            rows: rawRows.map((r): DeveloperRow => ({
                name: r.developer,
                country: r.top_country,
                countries: parseInt(r.country_count, 10),
                projects: parseInt(r.project_count, 10),
                registries: r.registries ?? [],
                categories: r.categories ?? [],
                totalIssued: parseFloat(r.total_issued),
                totalRetired: parseFloat(r.total_retired),
            })),
            total: countResult[0]?.total ?? 0,
        };
    }
}
