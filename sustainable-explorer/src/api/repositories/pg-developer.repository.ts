import { DataSource } from 'typeorm';
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
        // Nulls always last so empty-country / empty-issuance rows don't pin
        // themselves to the top when sorted ascending.
        const orderBy = `${sortColumn} ${direction} NULLS LAST, developer ASC`;

        const baseCte = `
            WITH dev_projects AS (
                SELECT
                    bv."sourceTimestamp"                  AS source_ts,
                    bv."businessData"->>'developer'       AS developer,
                    bv."businessData"->>'country'         AS country,
                    bv."businessData"->>'category'        AS category,
                    reg."displayName"                     AS registry_name
                FROM business_view bv
                LEFT JOIN LATERAL (
                    SELECT "displayName"
                    FROM business_view r
                    WHERE r."viewType" = 'REGISTRY'
                      AND r."registryDid" = bv."registryDid"
                    ORDER BY r."createdAt" DESC NULLS LAST
                    LIMIT 1
                ) reg ON true
                WHERE bv."viewType" = 'PROJECT'
                  AND bv."businessData"->>'developer' IS NOT NULL
                  AND bv."businessData"->>'developer' <> ''
            ),
            project_issued AS (
                SELECT
                    pml.project_source_timestamp AS source_ts,
                    COALESCE(SUM(pml.amount), 0)::numeric AS issued
                FROM project_mint_link pml
                GROUP BY pml.project_source_timestamp
            ),
            project_retired AS (
                SELECT
                    pml.project_source_timestamp AS source_ts,
                    COUNT(*) FILTER (WHERE nc.deleted = true)::numeric AS retired
                FROM project_mint_link pml
                JOIN nft_cache nc ON nc."tokenId" = pml.token_id
                GROUP BY pml.project_source_timestamp
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
                    COALESCE(SUM(pi.issued), 0)::numeric  AS total_issued,
                    COALESCE(SUM(pr.retired), 0)::numeric AS total_retired
                FROM dev_projects dp
                LEFT JOIN project_issued  pi ON pi.source_ts = dp.source_ts
                LEFT JOIN project_retired pr ON pr.source_ts = dp.source_ts
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
