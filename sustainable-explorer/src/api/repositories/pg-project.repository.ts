import { DataSource } from 'typeorm';
import {
    ProjectRepository,
    ProjectListQuery,
    ProjectListResult,
    ProjectRow,
    IssuanceRow,
} from './project.repository';
import { QueryBuilder } from './query-builder';
import { PROJECT_FIELD_SCHEMA } from './schemas/project.schema';

interface RawRow {
    id: string;
    sourceTimestamp: string;
    registryDid: string | null;
    relatedTopicId: string | null;
    displayName: string | null;
    businessData: Record<string, any> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    registry_name: string | null;
}

/**
 * LATERAL subquery joined into both findAll and findById to look up the
 * publishing registry's display name. Uses LATERAL so we can ORDER BY +
 * LIMIT 1 to handle the (rare) case of multiple REGISTRY rows for one DID.
 */
const REGISTRY_NAME_JOIN = `
    LEFT JOIN LATERAL (
        SELECT "displayName" AS registry_name
        FROM business_view
        WHERE "viewType" = 'REGISTRY'
          AND "registryDid" = bv."registryDid"
        ORDER BY "createdAt" DESC NULLS LAST
        LIMIT 1
    ) reg ON true
`;

/**
 * PostgreSQL implementation of the ProjectRepository.
 *
 * Generic filter and sort logic is delegated to QueryBuilder + the field
 * schema (PROJECT_FIELD_SCHEMA). Adding a new filterable/sortable column
 * only requires updating the schema — no SQL changes needed here.
 *
 * Special operations (full-text + fuzzy search, search ranking) remain
 * explicit because they don't fit the generic operator model.
 */
export class PgProjectRepository extends ProjectRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: ProjectListQuery): Promise<ProjectListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(PROJECT_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'PROJECT'`);

        // Generic filters: every filterable field defined in the schema
        // is wired automatically. To add a new filter, edit project.schema.ts.
        builder.addFilters({
            name: query.name,
            country: query.country,
            methodology: query.methodology,
            registry: query.registry,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
            policyTopicId: query.policyTopicId,
        });

        // Special: full-text search with ranking. The tsvector index covers
        // displayName (weight A), registryDid (B), and searchText (C).
        // ILIKE on displayName is kept as a fast prefix fallback for partial
        // word matches that tsquery doesn't catch.
        // similarity() provides typo-tolerance via pg_trgm.
        let rankExpr = '0';
        if (search) {
            const term = search.trim();
            const tsParam = builder.nextParam(term);
            const likeParam = builder.nextParam(`%${term}%`);
            const simParam = builder.nextParam(term);

            builder.addClause(`(
                bv."searchVector" @@ plainto_tsquery('english', ${tsParam})
                OR bv."displayName" ILIKE ${likeParam}
                OR bv."registryDid" ILIKE ${likeParam}
                OR similarity(COALESCE(bv."displayName", ''), ${simParam}) > 0.3
            )`);

            rankExpr = `
                ts_rank(bv."searchVector", plainto_tsquery('english', ${tsParam}))
                + COALESCE(similarity(bv."displayName", ${simParam}), 0)
            `;
        }

        // ORDER BY: search results rank by relevance; otherwise use schema sort
        const orderBy = search
            ? `search_rank DESC, bv."createdAt" DESC`
            : builder.buildOrderBy({
                  sortBy,
                  sortDir,
                  defaultExpr: 'bv."createdAt" DESC NULLS LAST',
              });

        const whereSql = builder.getWhereClause();
        const params = builder.getParams();

        // Append LIMIT/OFFSET as the last two params
        const limitParam = builder.nextParam(limit);
        const offsetParam = builder.nextParam(offset);

        const rowsSql = `
            SELECT
                bv.*,
                reg.registry_name,
                ${rankExpr} AS search_rank
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE and LATERAL join (so filters that
        // reference `reg.registry_name` resolve correctly), but skips the
        // LIMIT/OFFSET params.
        const countParams = params.slice(0, params.length - 2);
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            WHERE ${whereSql}
        `;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, params),
            this.dataSource.query(countSql, countParams),
        ]);

        return {
            rows: rawRows.map((row) => PgProjectRepository.mapRow(row)),
            total: countResult[0]?.total ?? 0,
        };
    }

    async findById(id: string): Promise<ProjectRow | null> {
        const rawRows: RawRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                reg.registry_name
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            WHERE bv."viewType" = 'PROJECT'
              AND bv."sourceTimestamp" = $1
            LIMIT 1
            `,
            [id],
        );

        if (rawRows.length === 0) return null;

        const row = rawRows[0];
        const policyTopicId = (row.businessData as Record<string, any> | null)?.['policyTopicId'] as string | null;
        const instanceTopicId = row.relatedTopicId;

        // Fetch CREDIT rows linked to this project. Credit rows have relatedTopicId equal
        // to the policy topic ID (where the Instance-Policy message was published).
        // We also fall back to the instance topic ID in case policyTopicId is not yet
        // stored (projects built before this field was added).
        const topicIds = [...new Set([policyTopicId, instanceTopicId].filter((t): t is string => !!t))];

        let issuances: IssuanceRow[] = [];
        if (topicIds.length > 0) {
            const placeholders = topicIds.map((_, i) => `$${i + 1}`).join(', ');
            const creditRows: Array<{
                tokenId: string | null;
                name: string | null;
                symbol: string | null;
                type: string | null;
                supply: string | null;
                mintDate: Date | null;
            }> = await this.dataSource.query(
                `
                SELECT
                    COALESCE(tc."tokenId", bv."businessData"->>'tokenId') AS "tokenId",
                    COALESCE(tc.name,      bv."displayName")              AS name,
                    COALESCE(tc.symbol,    bv."businessData"->>'symbol')  AS symbol,
                    tc.type,
                    tc."totalSupply"                                      AS supply,
                    bv."createdAt"                                        AS "mintDate"
                FROM business_view bv
                LEFT JOIN token_cache tc
                    ON tc."tokenId" = bv."businessData"->>'tokenId'
                WHERE bv."viewType" = 'CREDIT'
                  AND bv."relatedTopicId" IN (${placeholders})
                ORDER BY bv."createdAt" ASC
                `,
                topicIds,
            );

            issuances = creditRows.map(r => ({
                tokenId: r.tokenId ?? '',
                name: r.name ?? null,
                symbol: r.symbol ?? null,
                type: r.type ?? null,
                supply: r.supply != null ? parseFloat(r.supply) : 0,
                mintDate: r.mintDate ? r.mintDate.toISOString().split('T')[0] : null,
            }));
        }

        return PgProjectRepository.mapRow(row, issuances);
    }

    private static mapRow(row: RawRow, issuances?: IssuanceRow[]): ProjectRow {
        return {
            id: row.id,
            sourceTimestamp: row.sourceTimestamp,
            registryDid: row.registryDid,
            registryName: row.registry_name,
            relatedTopicId: row.relatedTopicId,
            displayName: row.displayName,
            businessData: row.businessData,
            searchText: row.searchText,
            lastUpdate: row.lastUpdate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            issuances,
        };
    }
}
