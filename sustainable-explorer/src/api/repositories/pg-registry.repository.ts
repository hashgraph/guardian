import { DataSource } from 'typeorm';
import { MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import {
    RegistryRepository,
    RegistryListQuery,
    RegistryListResult,
    RegistryRow,
    RegistryStatsRow,
    RegistryExportFilters,
    RegistryExportRow,
} from './registry.repository';
import { QueryBuilder } from './query-builder';
import { REGISTRY_FIELD_SCHEMA } from './schemas/registry.schema';

/** Batch size for the internally-batched `findAllForExport` LIMIT/OFFSET loop. */
const EXPORT_BATCH_SIZE = 2000;

/** Raw row shape for `findAllForExport` (see `RegistryExportRow` doc). */
interface RawExportRow {
    displayName: string | null;
    registryDid: string | null;
    geography: string | null;
    law: string | null;
    project_count: string | null;
    relatedTopicId: string | null;
    dataSource: string | null;
    ipfsCids: string[] | null;
}

/** The `message` row backing this REGISTRY's own originating VC (`business_view.sourceTimestamp` = `message.consensusTimestamp`), supplying `source_system_id`/`ipfs_document_ref` for `findAllForExport`. */
const SOURCE_MESSAGE_JOIN = `
    LEFT JOIN message src_msg ON src_msg."consensusTimestamp" = bv."sourceTimestamp"
`;

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

const SEARCH_TSVECTOR = `(
    setweight(to_tsvector('english', coalesce(bv."displayName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bv."registryDid", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bv."searchText", '')), 'C')
)`;

const REGISTRY_CANONICAL_DEDUP = `
    (
        bv."registryDid" IS NULL
        OR bv.id = (
            SELECT b2.id
            FROM business_view b2
            WHERE b2."viewType" = 'REGISTRY'
              AND b2."registryDid" = bv."registryDid"
            ORDER BY b2."sourceTimestamp"::numeric DESC, b2.id DESC
            LIMIT 1
        )
    )
`;

/** PostgreSQL implementation of the RegistryRepository; generic filter/sort logic is delegated to QueryBuilder + REGISTRY_FIELD_SCHEMA, while full-text search, MV joins, and ranking remain explicit since they don't fit the generic operator model. */
export class PgRegistryRepository extends RegistryRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: RegistryListQuery): Promise<RegistryListResult> {
        const { page, limit, search, sortBy, sortDir, hideEmpty } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(REGISTRY_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'REGISTRY'`);
        // Keep one row per registry so duplicate-message rows (same registryDid) don't surface as repeated list entries.
        builder.addClause(REGISTRY_CANONICAL_DEDUP);

        // Generic filters: every filterable field defined in the schema is wired automatically.
        builder.addFilters({
            displayName: query.displayName,
            did: query.did,
            id: query.id,
            tags: query.tags,
            geography: query.geography,
            law: query.law,
        });

        // Hide registries with no activity (policies/projects/issuances/users all zero); the MV is left-joined
        // in the row query but not the count query, so the JOIN is added to the count query below when set.
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

        // Full-text search with ranking: tsvector covers displayName/registryDid/searchText (name, description,
        // tags, geography, law, token info), ILIKE is a fast prefix fallback (e.g. "DOV" -> "DOVU"), and
        // similarity() adds typo-tolerance via pg_trgm.
        let rankExpr = '0';
        if (search) {
            const term = search.trim();
            const tsParam = builder.nextParam(term);
            const likeParam = builder.nextParam(`%${term}%`);
            const simParam = builder.nextParam(term);

            builder.addClause(`(
                ${SEARCH_TSVECTOR} @@ plainto_tsquery('english', ${tsParam})
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
                ts_rank(${SEARCH_TSVECTOR}, plainto_tsquery('english', ${tsParam}))
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

        // Count query reuses the same WHERE but no LIMIT/OFFSET, so slice the params back to before the additions.
        const countParams = params.slice(0, params.length - 2);
        // When hideEmpty is set the WHERE clause references the stats MV, so the count query needs the same LEFT JOIN.
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
            ORDER BY bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
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

    /** Full filtered, `registryDid`-deduped registries dataset for the export engine; batches internally via a LIMIT/OFFSET loop ordered by `sourceTimestamp`. */
    async findAllForExport(filters: RegistryExportFilters): Promise<RegistryExportRow[]> {
        const builder = new QueryBuilder(REGISTRY_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'REGISTRY'`);
        builder.addClause(REGISTRY_CANONICAL_DEDUP);

        builder.addFilters({
            displayName: filters.displayName,
            did: filters.did,
            id: filters.id,
            tags: filters.tags,
            geography: filters.geography,
            law: filters.law,
        });

        if (filters.hideEmpty) {
            builder.addClause(`COALESCE(
                s.policy_count + s.project_count + s.issuance_count + s.user_count,
                0
            ) > 0`);
        }

        if (filters.createdAtFrom) {
            const ts = Math.floor(new Date(filters.createdAtFrom).getTime() / 1000);
            const p = builder.nextParam(ts);
            builder.addClause(`bv."sourceTimestamp" IS NOT NULL AND bv."sourceTimestamp"::numeric >= ${p}`);
        }
        if (filters.createdAtTo) {
            const toDate = new Date(filters.createdAtTo);
            toDate.setHours(23, 59, 59, 999);
            const ts = Math.floor(toDate.getTime() / 1000);
            const p = builder.nextParam(ts);
            builder.addClause(`bv."sourceTimestamp" IS NOT NULL AND bv."sourceTimestamp"::numeric <= ${p}`);
        }

        if (filters.search) {
            const term = filters.search.trim();
            const tsParam = builder.nextParam(term);
            const likeParam = builder.nextParam(`%${term}%`);
            const simParam = builder.nextParam(term);

            builder.addClause(`(
                ${SEARCH_TSVECTOR} @@ plainto_tsquery('english', ${tsParam})
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
        }

        const whereSql = builder.getWhereClause();
        const baseParams = builder.getParams();
        const limitParam = `$${baseParams.length + 1}`;
        const offsetParam = `$${baseParams.length + 2}`;

        const rows: RegistryExportRow[] = [];
        for (let offset = 0; ; offset += EXPORT_BATCH_SIZE) {
            const params = [...baseParams, EXPORT_BATCH_SIZE, offset];

            const batchSql = `
                SELECT
                    bv."displayName",
                    bv."registryDid",
                    COALESCE(bv."businessData"->>'geography', bv."businessData"->'options'->>'geography') AS geography,
                    COALESCE(bv."businessData"->>'law', bv."businessData"->'options'->>'law') AS law,
                    COALESCE(s.project_count, 0) AS project_count,
                    bv."relatedTopicId",
                    src_msg."dataSource",
                    src_msg.files AS "ipfsCids"
                FROM business_view bv
                LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                    ON s."registryDid" = bv."registryDid"
                ${SOURCE_MESSAGE_JOIN}
                WHERE ${whereSql}
                ORDER BY bv."sourceTimestamp" ASC
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

            const batch: RawExportRow[] = await this.dataSource.query(batchSql, params);
            rows.push(...batch.map(PgRegistryRepository.mapExportRow));

            if (batch.length < EXPORT_BATCH_SIZE) break;
        }

        return rows;
    }

    private static mapExportRow(row: RawExportRow): RegistryExportRow {
        const cids = Array.isArray(row.ipfsCids)
            ? row.ipfsCids.filter((c): c is string => typeof c === 'string' && c.length > 0)
            : [];

        return {
            name: row.displayName ?? null,
            did: row.registryDid ?? null,
            geography: row.geography ?? null,
            law: row.law ?? null,
            project_count: row.project_count != null ? parseInt(row.project_count, 10) : 0,
            ipfs_document_ref: cids.length > 0 ? cids.join('; ') : null,
            // A registry has no Hedera token, so leave blank rather than fabricate;
            // `_topicId` still resolves a verification_url via the topic fallback.
            _consensusTimestamp: null,
            _tokenId: null,
            _topicId: row.relatedTopicId ?? null,
            _dataSource: row.dataSource ?? null,
        };
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
