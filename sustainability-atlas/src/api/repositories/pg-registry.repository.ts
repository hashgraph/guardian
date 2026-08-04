import { BadRequestException } from '@nestjs/common';
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

/** Ceiling on rows a single export may stream; exceeding it throws rather than truncating. */
const EXPORT_MAX_ROWS = 100_000;

/** Raw row shape for `findAllForExport` (see `RegistryExportRow` doc). */
interface RawExportRow {
    displayName: string | null;
    registryDid: string | null;
    geography: string | null;
    law: string | null;
    project_count: string | null;
    methodology_count: string | null;
    number_of_issuances: string | null;
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
    total_issued: string | null;
    total_retired: string | null;
}

const SEARCH_TSVECTOR = `(
    setweight(to_tsvector('english', coalesce(bv."displayName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bv."registryDid", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bv."searchText", '')), 'C')
)`;

/**
 * Selects one canonical row per registry.
 *
 * `business_view` is grained one row per Hedera message, so a registry that
 * republishes its DID document yields several REGISTRY rows sharing one
 * `registryDid`. The canonical pick is the newest `sourceTimestamp`; rows with
 * a NULL `registryDid` have nothing to dedup against and are always kept.
 *
 * A non-correlated `DISTINCT ON` derived table, evaluated once and joined on
 * `id`. Mirrors PgMethodologyRepository's CANONICAL_JOIN.
 */
const CANONICAL_JOIN = `
    LEFT JOIN ${MV_REGISTRY_STATS_NAME} canon
        ON canon."registryDid" = bv."registryDid"
`;

const REGISTRY_CANONICAL_DEDUP = `
    (bv."registryDid" IS NULL OR canon.canonical_id = bv.id)
`;

/**
 * Canonical REGISTRY rows for findAll/findAllForExport, driven from the small
 * mv_registry_stats canonical set (joined to business_view by primary key)
 * instead of scanning every business_view row and filtering by viewType. On
 * testnet, republish churn means raw REGISTRY rows can outnumber canonical
 * registries by 100-200x (8,851 raw vs 38 canonical, confirmed live) —
 * driving from the small side lets Postgres's planner pick an indexed lookup
 * instead of a full-table seq scan, which is what previously dominated
 * list/count/export latency there. Mirrors PgMethodologyRepository's
 * METHODOLOGY_CANDIDATE_CTE, including the UNION ALL fallback branch for the
 * (structurally possible but never observed) REGISTRY row with no
 * registryDid, which mv_registry_stats can't key and therefore has nothing
 * to dedup against.
 */
const REGISTRY_CANDIDATE_CTE = `
    WITH candidate AS (
        SELECT
            bv.*,
            s.policy_count,
            s.project_count,
            s.issuance_count,
            s.user_count,
            s.total_issued,
            s.total_retired
        FROM ${MV_REGISTRY_STATS_NAME} s
        JOIN business_view bv ON bv.id = s.canonical_id

        UNION ALL

        SELECT
            bv.*,
            NULL::bigint AS policy_count,
            NULL::bigint AS project_count,
            NULL::numeric AS issuance_count,
            NULL::bigint AS user_count,
            NULL::bigint AS total_issued,
            NULL::bigint AS total_retired
        FROM business_view bv
        WHERE bv."viewType" = 'REGISTRY' AND bv."registryDid" IS NULL
    )
`;

/** PostgreSQL implementation of the RegistryRepository; generic filter/sort logic is delegated to QueryBuilder + REGISTRY_FIELD_SCHEMA, while full-text search, MV joins, and ranking remain explicit since they don't fit the generic operator model. */
export class PgRegistryRepository extends RegistryRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    /**
     * Distinct registry display names, for filter dropdowns.
     *
     * `hideEmpty` mirrors the list endpoint's flag so the dropdown offers the
     * same registries the list shows.
     */
    async findNameOptions(hideEmpty = true): Promise<string[]> {
        const emptyClause = hideEmpty
            ? `AND COALESCE(s.policy_count + s.project_count + s.issuance_count + s.user_count, 0) > 0`
            : '';

        const rows: Array<{ name: string }> = await this.dataSource.query(`
            SELECT DISTINCT bv."displayName" AS name
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s."registryDid" = bv."registryDid"
            ${CANONICAL_JOIN}
            WHERE bv."viewType" = 'REGISTRY'
              AND ${REGISTRY_CANONICAL_DEDUP}
              AND NULLIF(bv."displayName", '') IS NOT NULL
              ${emptyClause}
            ORDER BY name ASC
        `);

        return rows.map(r => r.name);
    }

    async findAll(query: RegistryListQuery): Promise<RegistryListResult> {
        const { page, limit, search, sortBy, sortDir, hideEmpty } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(REGISTRY_FIELD_SCHEMA);

        // Generic filters: every filterable field defined in the schema is wired automatically.
        builder.addFilters({
            displayName: query.displayName,
            did: query.did,
            id: query.id,
            tags: query.tags,
            geography: query.geography,
            law: query.law,
        });

        // Hide registries with no activity (policies/projects/issuances/users all zero) —
        // against the candidate CTE's own stat columns, same NULL-for-unmatched semantics
        // as the pre-rewrite LEFT JOIN.
        if (hideEmpty) {
            builder.addClause(`COALESCE(
                bv.policy_count + bv.project_count + bv.issuance_count + bv.user_count,
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
            ${REGISTRY_CANDIDATE_CTE}
            SELECT bv.*, ${rankExpr} AS search_rank
            FROM candidate bv
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE but no LIMIT/OFFSET, so slice the params back to before the additions.
        const countParams = params.slice(0, params.length - 2);
        const countSql = `
            ${REGISTRY_CANDIDATE_CTE}
            SELECT COUNT(*)::int AS total
            FROM candidate bv
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
                s.user_count,
                s.total_issued,
                s.total_retired
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
                s.user_count,
                s.total_issued,
                s.total_retired
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
        // viewType='REGISTRY' and the canonical-row dedup are baked into
        // REGISTRY_CANDIDATE_CTE below.

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
                bv.policy_count + bv.project_count + bv.issuance_count + bv.user_count,
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
                ${REGISTRY_CANDIDATE_CTE}
                SELECT
                    bv."displayName",
                    bv."registryDid",
                    COALESCE(bv."businessData"->>'geography', bv."businessData"->'options'->>'geography') AS geography,
                    COALESCE(bv."businessData"->>'law', bv."businessData"->'options'->>'law') AS law,
                    COALESCE(bv.project_count, 0) AS project_count,
                    COALESCE(bv.policy_count, 0) AS methodology_count,
                    COALESCE(bv.issuance_count, 0) AS number_of_issuances,
                    bv."relatedTopicId",
                    src_msg."dataSource",
                    src_msg.files AS "ipfsCids"
                FROM candidate bv
                ${SOURCE_MESSAGE_JOIN}
                WHERE ${whereSql}
                ORDER BY bv."sourceTimestamp" ASC
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

            const batch: RawExportRow[] = await this.dataSource.query(batchSql, params);
            rows.push(...batch.map(PgRegistryRepository.mapExportRow));

            if (batch.length < EXPORT_BATCH_SIZE) break;
            if (rows.length >= EXPORT_MAX_ROWS) {
                throw new BadRequestException(
                    `Export matched more than ${EXPORT_MAX_ROWS.toLocaleString()} rows. ` +
                    'Narrow the filters (date range, registry, or search) and try again.',
                );
            }
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
            methodology_count: row.methodology_count != null ? parseInt(row.methodology_count, 10) : 0,
            number_of_issuances: row.number_of_issuances != null ? parseInt(row.number_of_issuances, 10) : 0,
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
            totalIssued: parseInt(row.total_issued || '0', 10),
            totalRetired: parseInt(row.total_retired || '0', 10),
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
