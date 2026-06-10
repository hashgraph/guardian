import { DataSource } from 'typeorm';
import { MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import {
    RegistryRepository,
    RegistryListQuery,
    RegistryListResult,
    RegistryRow,
    RegistryStatsRow,
} from './registry.repository';
import { QueryBuilder } from './query-builder';
import { REGISTRY_FIELD_SCHEMA } from './schemas/registry.schema';

interface RawRow {
    id: string;
    viewType: string;
    sourceTimestamp: string;
    registryDid: string | null;
    relatedTopicId: string | null;
    displayName: string | null;
    businessData: Record<string, any> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    policy_count: string | null;
    project_count: string | null;
    issuance_count: string | null;
    user_count: string | null;
}

/**
 * PostgreSQL implementation of the RegistryRepository.
 *
 * Generic filter and sort logic is delegated to QueryBuilder + the field
 * schema (REGISTRY_FIELD_SCHEMA). Adding a new filterable/sortable column
 * only requires updating the schema — no SQL changes needed here.
 *
 * Special operations (full-text + fuzzy search, materialized view joins,
 * search ranking) remain explicit because they don't fit the generic
 * operator model.
 */
export class PgRegistryRepository extends RegistryRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: RegistryListQuery): Promise<RegistryListResult> {
        const { page, limit, search, sortBy, sortDir, hideEmpty } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(REGISTRY_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'REGISTRY'`);

        // Generic filters: every filterable field defined in the schema
        // is wired automatically. To add a new filter, edit registry.schema.ts.
        builder.addFilters({
            displayName: query.displayName,
            did: query.did,
            id: query.id,
            tags: query.tags,
            geography: query.geography,
            law: query.law,
        });

        // Hide registries with no activity (policies/projects/issuances/users
        // all zero). The MV is left-joined in the row query but not in the
        // count query, so we add the JOIN to the count query below when set.
        if (hideEmpty) {
            builder.addClause(`COALESCE(
                s.policy_count + s.project_count + s.issuance_count + s.user_count,
                0
            ) > 0`);
        }

        // Date range filter on sourceTimestamp (Hedera on-chain timestamp, seconds since epoch)
        if (query.createdAtFrom) {
            const ts = Math.floor(new Date(query.createdAtFrom).getTime() / 1000);
            const p = builder.nextParam(ts);
            builder.addClause(`bv."sourceTimestamp" IS NOT NULL AND bv."sourceTimestamp"::numeric >= ${p}`);
        }
        if (query.createdAtTo) {
            const toDate = new Date(query.createdAtTo);
            toDate.setHours(23, 59, 59, 999);
            const ts = Math.floor(toDate.getTime() / 1000);
            const p = builder.nextParam(ts);
            builder.addClause(`bv."sourceTimestamp" IS NOT NULL AND bv."sourceTimestamp"::numeric <= ${p}`);
        }

        // Special: full-text search with ranking. The tsvector index covers
        // displayName (weight A), registryDid (B), and searchText (C) which
        // includes name + description + tags + geography + law + token info.
        // ILIKE on displayName is kept as a fast prefix fallback for partial
        // word matches that tsquery doesn't catch (e.g. "DOV" → "DOVU").
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
                OR bv."relatedTopicId" ILIKE ${likeParam}
                OR bv."businessData"->>'geography' ILIKE ${likeParam}
                OR bv."businessData"->'options'->>'geography' ILIKE ${likeParam}
                OR bv."businessData"->'options'->'attributes'->>'geography' ILIKE ${likeParam}
                OR bv."businessData"->'options'->'attributes'->>'Country' ILIKE ${likeParam}
                OR bv."businessData"->>'law' ILIKE ${likeParam}
                OR bv."businessData"->'options'->>'law' ILIKE ${likeParam}
                OR bv."businessData"->'options'->'attributes'->>'law' ILIKE ${likeParam}
                OR bv."businessData"->>'tags' ILIKE ${likeParam}
                OR bv."businessData"->'options'->>'tags' ILIKE ${likeParam}
                OR bv."businessData"->'options'->'attributes'->>'tags' ILIKE ${likeParam}
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
                s.policy_count,
                s.project_count,
                s.issuance_count,
                s.user_count,
                ${rankExpr} AS search_rank
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s."registryDid" = bv."registryDid"
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE but no LIMIT/OFFSET, so we slice
        // the params back to before the limit/offset additions.
        const countParams = params.slice(0, params.length - 2);
        // When hideEmpty is set the WHERE clause references the stats MV, so
        // the count query must include the same LEFT JOIN. Otherwise we keep
        // the count query lean (no MV join needed).
        const countJoin = hideEmpty
            ? `LEFT JOIN ${MV_REGISTRY_STATS_NAME} s ON s."registryDid" = bv."registryDid"`
            : '';
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            ${countJoin}
            WHERE ${whereSql}
        `;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, params),
            this.dataSource.query(countSql, countParams),
        ]);

        return {
            rows: rawRows.map(PgRegistryRepository.mapRow),
            total: countResult[0]?.total ?? 0,
        };
    }

    async findByDid(did: string): Promise<RegistryRow | null> {
        const rawRows: RawRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                s.policy_count,
                s.project_count,
                s.issuance_count,
                s.user_count
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s."registryDid" = bv."registryDid"
            WHERE bv."viewType" = 'REGISTRY'
              AND bv."registryDid" = $1
            LIMIT 1
            `,
            [did],
        );

        if (rawRows.length === 0) return null;
        return PgRegistryRepository.mapRow(rawRows[0]);
    }

    async findById(id: string): Promise<RegistryRow | null> {
        const rawRows: RawRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                s.policy_count,
                s.project_count,
                s.issuance_count,
                s.user_count
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s."registryDid" = bv."registryDid"
            WHERE bv."viewType" = 'REGISTRY'
              AND bv.id = $1
            LIMIT 1
            `,
            [id],
        );

        if (rawRows.length === 0) return null;
        return PgRegistryRepository.mapRow(rawRows[0]);
    }

    private static mapRow(row: RawRow): RegistryRow {
        const stats: RegistryStatsRow = {
            policyCount: parseInt(row.policy_count || '0', 10),
            projectCount: parseInt(row.project_count || '0', 10),
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            userCount: parseInt(row.user_count || '0', 10),
        };

        return {
            id: row.id,
            viewType: row.viewType,
            sourceTimestamp: row.sourceTimestamp,
            registryDid: row.registryDid,
            relatedTopicId: row.relatedTopicId,
            displayName: row.displayName,
            businessData: row.businessData,
            searchText: row.searchText,
            lastUpdate: row.lastUpdate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            stats,
        };
    }
}
