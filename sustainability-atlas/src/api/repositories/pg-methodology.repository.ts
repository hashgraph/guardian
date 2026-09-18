import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MV_METHODOLOGY_STATS_NAME, MV_PROJECT_STATS_NAME, MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import {
    MethodologyRepository,
    MethodologyListQuery,
    MethodologyListResult,
    MethodologyRow,
    MethodologyStatsRow,
    IssuanceRow,
    IssuanceEventRow,
    MethodologyExportFilters,
    MethodologyExportRow,
    MethodologyLifecycleStatus,
    METHODOLOGY_LIFECYCLE_STATUSES,
} from './methodology.repository';
import { QueryBuilder } from './query-builder';
import { METHODOLOGY_FIELD_SCHEMA } from './schemas/methodology.schema';

/** Batch size for the internally-batched `findAllForExport` LIMIT/OFFSET loop. */
const EXPORT_BATCH_SIZE = 2000;

/** Ceiling on rows a single export may stream; exceeding it throws rather than truncating. */
const EXPORT_MAX_ROWS = 100_000;

/** Raw row shape for `findAllForExport` (see `MethodologyExportRow` doc). */
interface RawExportRow {
    name: string | null;
    registry_name: string | null;
    version: string | null;
    emission_reduction_approach: unknown;
    project_count: string | null;
    relatedTopicId: string | null;
    dataSource: string | null;
    ipfsCids: string[] | null;
}

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
    project_count: string | null;
    instance_project_count: string | null;
    issuance_count: string | null;
    instance_issuance_count: string | null;
    schema_count: string | null;
    registry_name: string | null;
    decode_status: string | null;
    sectoral_scopes: unknown | null;
    emission_reduction_approach: unknown | null;
    policy_source_cid: string | null;
    // pg returns bigint columns as strings
    total_issued: string | null;
    total_retired: string | null;
    /** Only present on `findAll`'s rows query, which folds the total in via COUNT(*) OVER(). */
    total_count?: number;
}

/**
 * Looks up the publishing registry's display name from `mv_registry_stats`,
 * which resolves the latest REGISTRY row per registryDid once per MV refresh
 * instead of per request. Keyed by registryDid (unique index), so the join is
 * a cheap lookup. Mirrors PgProjectRepository's REGISTRY_NAME_JOIN.
 */
const REGISTRY_NAME_JOIN = `
    LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg ON reg."registryDid" = bv."registryDid"
`;

/** Brings in the decode status for the methodology's policy topic (businessData->>'topicId'); collapses via LATERAL — prefer the latest decoded row, fall back to the latest row of any status — since a policyTopicId can have N policy rows. */
const POLICY_DECODE_STATUS_JOIN = `
    LEFT JOIN LATERAL (
        SELECT *
        FROM policy
        WHERE "policyTopicId" = bv."businessData"->>'topicId'
        ORDER BY ("decodeStatus" = 'decoded') DESC NULLS LAST,
                 "updatedAt" DESC NULLS LAST
        LIMIT 1
    ) p ON TRUE
`;

/** Maps policy.decodeStatus ('decoded'/'pending'/'failed') to the public API vocabulary ('success'/'pending'/'failed'). */
const effectiveDecodeStatus = (col: string): string => `
    CASE
        WHEN ${col} = 'decoded' THEN 'success'
        ELSE ${col}
    END
`;

/** Over the stats MV's precomputed column — used by the list and export paths. */
const EFFECTIVE_DECODE_STATUS = effectiveDecodeStatus('canon.decode_status');

/** Over a live `policy` join — used by findById, which resolves one row exactly. */
const EFFECTIVE_DECODE_STATUS_LIVE = effectiveDecodeStatus('p."decodeStatus"');

// business_view."searchVector" is a STORED generated column with this exact
// expression (see schema-bootstrap.ts) — referencing it directly, rather than
// recomputing the expression inline, lets the planner match it back to
// idx_business_view_search_vector (GIN). An inline recompute is opaque to the
// planner even though it's byte-identical, so it was never reaching that index.
const SEARCH_TSVECTOR = `bv."searchVector"`;

/** The `message` row backing this METHODOLOGY's own originating VC (`business_view.sourceTimestamp` = `message.consensusTimestamp`), supplying `source_system_id`/`ipfs_document_ref` for `findAllForExport`. */
const SOURCE_MESSAGE_JOIN = `
    LEFT JOIN message src_msg ON src_msg."consensusTimestamp" = bv."sourceTimestamp"
`;

/**
 * Selects one canonical row per methodology.
 *
 * `business_view` is grained one row per Hedera message, so republishing a
 * methodology yields several METHODOLOGY rows sharing one `relatedTopicId`.
 * The canonical pick is the newest `sourceTimestamp`; rows with a NULL
 * `relatedTopicId` have nothing to dedup against and are always kept.
 *
 * A non-correlated `DISTINCT ON` derived table, evaluated once and joined on
 * `id`, so the dedup cost does not scale with the number of candidate rows.
 */
const CANONICAL_JOIN = `
    LEFT JOIN ${MV_METHODOLOGY_STATS_NAME} canon
        ON canon."relatedTopicId" = bv."relatedTopicId"
`;

const METHODOLOGY_CANONICAL_DEDUP = `
    (bv."relatedTopicId" IS NULL OR canon.canonical_id = bv.id)
`;

/**
 * Canonical METHODOLOGY rows for findAll/findAllForExport, driven from the
 * small mv_methodology_stats canonical set (joined to business_view by
 * primary key) instead of scanning every business_view row and filtering by
 * viewType. On testnet, republish churn means raw METHODOLOGY rows can
 * outnumber canonical methodologies by 100-200x (19,887 raw vs ~106
 * canonical, confirmed live) — driving from the small side lets Postgres's
 * planner pick an indexed lookup instead of a full-table seq scan, which is
 * what previously dominated list/count/export latency on testnet.
 *
 * UNIONed with the (structurally possible but never observed) case of a
 * METHODOLOGY row with no relatedTopicId: mv_methodology_stats can't key
 * such a row, so it has nothing to dedup against — this branch preserves the
 * pre-rewrite dedup clause's "always kept" rule for it. Both branches select
 * the identical column list so the UNION output is a drop-in replacement for
 * the old `business_view bv LEFT JOIN mv_methodology_stats canon` shape;
 * everything downstream (filters, search, sort, mapRow) is unchanged.
 */
const METHODOLOGY_CANDIDATE_CTE = `
    WITH candidate AS (
        SELECT
            bv.*,
            canon.project_count,
            canon.instance_project_count,
            canon.issuance_count,
            canon.instance_issuance_count,
            canon.schema_count,
            canon.registry_name,
            (${EFFECTIVE_DECODE_STATUS}) AS decode_status,
            canon.sectoral_scopes,
            canon.emission_reduction_approach,
            canon.total_issued,
            canon.total_retired
        FROM ${MV_METHODOLOGY_STATS_NAME} canon
        JOIN business_view bv ON bv.id = canon.canonical_id
        -- Logically redundant (canonical_id only ever points at a METHODOLOGY row),
        -- but the planner can't infer that: without it, it scans every
        -- business_view row of all four view types and lets the join discard the
        -- other three. Stating it gives it a pushdown-able qualifier against
        -- idx_business_view_view_type_created. Planner hint only — no behaviour change.
        WHERE bv."viewType" = 'METHODOLOGY'

        UNION ALL

        SELECT
            bv.*,
            NULL::bigint AS project_count,
            NULL::bigint AS instance_project_count,
            NULL::bigint AS issuance_count,
            NULL::bigint AS instance_issuance_count,
            NULL::bigint AS schema_count,
            reg.registry_name,
            (${EFFECTIVE_DECODE_STATUS_LIVE}) AS decode_status,
            p."policyMapping"->'sectoralScopes' AS sectoral_scopes,
            p."policyMapping"->'emissionReductionApproach' AS emission_reduction_approach,
            NULL::bigint AS total_issued,
            NULL::bigint AS total_retired
        FROM business_view bv
        ${REGISTRY_NAME_JOIN}
        ${POLICY_DECODE_STATUS_JOIN}
        WHERE bv."viewType" = 'METHODOLOGY' AND bv."relatedTopicId" IS NULL
    )
`;

/**
 * Fast path for the unfiltered, unsearched, default-sorted list view (page 1+
 * of `/methodologies` with no query params) — the common case, and the one
 * measured at 408ms in the SE-177 perf audit. Unlike METHODOLOGY_CANDIDATE_CTE,
 * this pushes ORDER BY + LIMIT into each UNION branch (mirroring
 * PgActivityRepository's pattern), so Postgres can walk
 * idx_mv_methodology_stats_created_at in createdAt order and stop at the inner
 * limit instead of joining the full ~20k-row candidate set to business_view
 * and sorting it before LIMIT is applied — that full join+sort (a Seq Scan of
 * business_view feeding a Hash Join) was the actual measured cost, not the
 * "no relatedTopicId" fallback branch, which is already index-backed and
 * empty in practice.
 *
 * Only valid with no WHERE clause beyond each branch's own — any filter or
 * search term must go through METHODOLOGY_CANDIDATE_CTE + findAll's general
 * path below, since pushing a LIMIT before a filter is applied could drop
 * rows that would otherwise match.
 */
const methodologyCandidateCteFast = (
    innerLimitParam: string,
    lifecycleWhere: string | null = null,
): string => `
    WITH candidate AS (
        (
            SELECT
                bv.*,
                canon.project_count,
                canon.instance_project_count,
                canon.issuance_count,
                canon.instance_issuance_count,
                canon.schema_count,
                canon.registry_name,
                (${EFFECTIVE_DECODE_STATUS}) AS decode_status,
                canon.sectoral_scopes,
                canon.emission_reduction_approach,
                canon.total_issued,
                canon.total_retired
            FROM ${MV_METHODOLOGY_STATS_NAME} canon
            JOIN business_view bv ON bv.id = canon.canonical_id
            ${lifecycleWhere ? `WHERE ${lifecycleWhere}` : ''}
            ORDER BY canon."createdAt" DESC NULLS LAST
            LIMIT ${innerLimitParam}
        )
        UNION ALL
        (
            SELECT
                bv.*,
                NULL::bigint AS project_count,
                NULL::bigint AS instance_project_count,
                NULL::bigint AS issuance_count,
                NULL::bigint AS instance_issuance_count,
                NULL::bigint AS schema_count,
                reg.registry_name,
                (${EFFECTIVE_DECODE_STATUS_LIVE}) AS decode_status,
                p."policyMapping"->'sectoralScopes' AS sectoral_scopes,
                p."policyMapping"->'emissionReductionApproach' AS emission_reduction_approach,
                NULL::bigint AS total_issued,
                NULL::bigint AS total_retired
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            ${POLICY_DECODE_STATUS_JOIN}
            WHERE bv."viewType" = 'METHODOLOGY' AND bv."relatedTopicId" IS NULL
            ${lifecycleWhere ? `AND ${lifecycleWhere}` : ''}
            ORDER BY bv."createdAt" DESC NULLS LAST
            LIMIT ${innerLimitParam}
        )
    )
`;

/** Over the candidate CTE's already-effective-mapped decode_status column — used by findAll/findAllForExport's decodeStatus filter (no need to re-wrap in the success/pending/failed CASE). */
const CANDIDATE_DECODE_STATUS = `bv."decode_status"`;

/**
 * Lifecycle predicate over `businessData.discontinuedAt`, which PolicyStatusProcessor
 * writes from the newest valid discontinue message for that instance topic.
 *
 * Compared against now() rather than stored as a status, because Guardian emits
 * NO message when a deferred discontinuation's date arrives — a stored flag
 * would stay wrong until something happened to recompute it. Evaluating here
 * means the flip happens on the date itself, on the very next request.
 *
 * Takes an alias so it can be used both inside the fast path's UNION branches
 * (where the row is still `bv`/`business_view`) and over the candidate CTE.
 *
 * The dated buckets repeat idx_business_view_methodology_discontinued's own
 * predicate (`"viewType" = 'METHODOLOGY' AND discontinuedAt IS NOT NULL`) so the
 * planner can match that partial index. Every caller only ever sees METHODOLOGY
 * rows, so the extra `viewType` term never changes a result.
 */
const lifecycleStatusPredicate = (
    statuses: MethodologyLifecycleStatus[] | undefined,
    alias = 'bv',
): string | null => {
    const wanted = new Set<MethodologyLifecycleStatus>(
        statuses?.length ? statuses : METHODOLOGY_LIFECYCLE_STATUSES,
    );
    // Every bucket requested — no predicate at all, which is what keeps an
    // unfiltered list on the indexed fast path.
    if (METHODOLOGY_LIFECYCLE_STATUSES.every(s => wanted.has(s))) return null;

    const at = `(${alias}."businessData"->>'discontinuedAt')`;
    const dateClauses: string[] = [];
    if (wanted.has('to_be_discontinued')) dateClauses.push(`${at}::timestamptz > now()`);
    if (wanted.has('discontinued')) dateClauses.push(`${at}::timestamptz <= now()`);

    const dated = dateClauses.length > 0
        ? `(${alias}."viewType" = 'METHODOLOGY' AND ${at} IS NOT NULL AND (${dateClauses.join(' OR ')}))`
        : null;

    if (!wanted.has('published')) return dated;
    return dated ? `(${at} IS NULL OR ${dated})` : `${at} IS NULL`;
};

/**
 * LATERAL subquery that computes totalIssued/totalRetired for each methodology in the list.
 *
 * Sums the already-precomputed per-project ${MV_PROJECT_STATS_NAME} (issued/retired via
 * project_mint_link + nft_cache, refreshed periodically by MvRefreshProcessor) over the
 * projects belonging to this methodology instance, instead of re-deriving those sums live
 * from project_mint_link/token_cache with a correlated nft_cache subquery per mint row —
 * that per-row-per-mint recomputation, multiplied by every methodology row on the list page,
 * is what made the methodologies list endpoint take 20+ seconds under Testnet's data volume.
 * findById still computes this live for its single row/issuance-detail view, so it stays exact.
 */
const LIFECYCLE_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            COALESCE(SUM(mps.total_issued), 0)::bigint AS total_issued,
            COALESCE(SUM(mps.total_retired), 0)::bigint AS total_retired
        FROM business_view proj
        JOIN ${MV_PROJECT_STATS_NAME} mps ON mps."projectKey" = proj."projectKey"
        WHERE proj."viewType" = 'PROJECT'
          AND proj."businessData"->>'instanceTopicId' = bv."relatedTopicId"
          AND bv."relatedTopicId" IS NOT NULL
    ) lc_m ON true
`;

/** PostgreSQL implementation of the MethodologyRepository; generic filter/sort logic is delegated to QueryBuilder + METHODOLOGY_FIELD_SCHEMA, while full-text search, MV joins, and ranking remain explicit since they don't fit the generic operator model. */
export class PgMethodologyRepository extends MethodologyRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    /** Distinct methodology display names, deduplicated to one row per canonical methodology. */
    async findNameOptions(): Promise<string[]> {
        const rows: Array<{ name: string }> = await this.dataSource.query(`
            SELECT DISTINCT bv."displayName" AS name
            FROM business_view bv
            ${CANONICAL_JOIN}
            WHERE bv."viewType" = 'METHODOLOGY'
              AND ${METHODOLOGY_CANONICAL_DEDUP}
              AND NULLIF(bv."displayName", '') IS NOT NULL
            ORDER BY name ASC
        `);

        return rows.map(r => r.name);
    }

    async findAll(query: MethodologyListQuery): Promise<MethodologyListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        // `createdAt` descending counts as the default sort: it's what the list
        // view's initial state always sends (so `sortBy` is never actually
        // absent on a real default page load), and it's the order the fast path
        // hard-codes anyway. Direction follows buildOrderBy's convention —
        // anything that isn't case-insensitively 'ASC' is DESC.
        const isDefaultSort = !sortBy
            || (sortBy === 'createdAt' && String(sortDir || '').toUpperCase() !== 'ASC');

        // No filters, no search, default sort => safe to take the indexed fast
        // path (see methodologyCandidateCteFast's doc comment for why).
        const lifecycleWhere = lifecycleStatusPredicate(query.status);

        const isDefaultView = !search && isDefaultSort
            && !query.name && !query.id && !query.description
            && !query.decodeStatus?.length
            && !query.registryDid && !query.registryName && !query.version && !query.policyTopicId;

        if (isDefaultView) {
            return this.findAllDefaultView(offset, limit, lifecycleWhere, query.status);
        }

        const builder = new QueryBuilder(METHODOLOGY_FIELD_SCHEMA);

        // Generic filters: every filterable field defined in the schema is wired automatically.
        builder.addFilters({
            name: query.name,
            id: query.id,
            description: query.description,
            registryDid: query.registryDid,
            registryName: query.registryName,
            version: query.version,
            policyTopicId: query.policyTopicId,
        });

        // decodeStatus filter matches against the candidate CTE's already-effective-mapped
        // decode_status column; supports pipe-separated multi-values (e.g. "success|failed").
        if (query.decodeStatus?.length) {
            const statuses = query.decodeStatus;
            const hasUnknown = statuses.includes('unknown');
            const otherStatuses = statuses.filter(s => s !== 'unknown');

            const clauses: string[] = [];
            if (hasUnknown) clauses.push(`(${CANDIDATE_DECODE_STATUS}) IS NULL`);
            if (otherStatuses.length === 1) {
                const p = builder.nextParam(otherStatuses[0]);
                clauses.push(`(${CANDIDATE_DECODE_STATUS}) = ${p}`);
            } else if (otherStatuses.length > 1) {
                const p = builder.nextParam(otherStatuses);
                clauses.push(`(${CANDIDATE_DECODE_STATUS}) = ANY(${p}::text[])`);
            }

            if (clauses.length > 0) {
                builder.addClause(clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`);
            }
        }

        // Same predicate as the fast path, applied over the candidate CTE (whose
        // rows still carry business_view's own columns under the `bv` alias).
        if (lifecycleWhere) {
            builder.addClause(lifecycleWhere);
        }

        // Full-text search with ranking: tsvector covers displayName/registryDid/searchText, ILIKE is a fast
        // prefix fallback for partial matches tsquery doesn't catch, and similarity() adds typo-tolerance via pg_trgm.
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

        // COUNT(*) OVER() is evaluated over the filtered candidate set this query
        // already builds for ranking/sorting, before LIMIT is applied — so the
        // total rides back on the rows instead of costing a second,
        // independently-planned pass over the same CTE.
        const rowsSql = `
            ${METHODOLOGY_CANDIDATE_CTE}
            SELECT bv.*, ${rankExpr} AS search_rank, (COUNT(*) OVER())::int AS total_count
            FROM candidate bv
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const rawRows: RawRow[] = await this.dataSource.query(rowsSql, params);

        return {
            rows: rawRows.map(row => PgMethodologyRepository.mapRow(row)),
            // Empty page (no matches, or an offset past the end) carries no window
            // row to read the total off.
            total: rawRows[0]?.total_count ?? 0,
        };
    }

    /**
     * Indexed fast path for findAll's default view (see methodologyCandidateCteFast).
     * The count is likewise computed without touching business_view's full
     * METHODOLOGY row set: mv_methodology_stats has exactly one row per
     * canonical methodology (unique index on relatedTopicId), so its row
     * count alone gives the canonical total; the fallback-branch count is a
     * single index-backed lookup.
     */
    private async findAllDefaultView(
        offset: number,
        limit: number,
        lifecycleWhere: string | null = null,
        statuses?: MethodologyLifecycleStatus[],
    ): Promise<MethodologyListResult> {
        const innerLimit = offset + limit;

        const rowsSql = `
            ${methodologyCandidateCteFast('$1', lifecycleWhere)}
            SELECT bv.*
            FROM candidate bv
            ORDER BY bv."createdAt" DESC NULLS LAST
            LIMIT $2 OFFSET $3
        `;

        // Unfiltered, the canonical count is the MV's own row count. Filtered, the
        // dated buckets are counted through idx_business_view_methodology_discontinued
        // (only the ~hundreds of rows that carry a date). `published` cannot use
        // that index — an index finds rows that have a value, not rows that lack
        // one — so a filter that includes it is counted as the MV total minus the
        // buckets it excludes, which are always dated. Joining business_view for
        // the flag directly made the planner scan the whole table instead.
        const canonicalCountSql = (() => {
            const total = `SELECT COUNT(*) FROM ${MV_METHODOLOGY_STATS_NAME}`;
            if (!lifecycleWhere) return total;
            const datedCount = (where: string) =>
                `SELECT COUNT(*) FROM ${MV_METHODOLOGY_STATS_NAME} canon
                   JOIN business_view bv ON bv.id = canon.canonical_id
                  WHERE ${where}`;
            if (!statuses?.includes('published')) return datedCount(lifecycleWhere);
            const excluded = METHODOLOGY_LIFECYCLE_STATUSES.filter(s => !statuses.includes(s));
            const excludedWhere = lifecycleStatusPredicate(excluded);
            return excludedWhere ? `(${total}) - (${datedCount(excludedWhere)})` : total;
        })();

        // A METHODOLOGY row with no relatedTopicId has no instance topic, so no
        // discontinue message can ever name it: it is always `published`, and
        // contributes nothing to a count that excludes that bucket.
        const wantsPublished = !statuses?.length || statuses.includes('published');
        const fallbackCountSql = wantsPublished
            ? `SELECT COUNT(*) FROM business_view WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NULL`
            : `SELECT 0`;

        const countSql = `
            SELECT
                (${canonicalCountSql})::int +
                (${fallbackCountSql})::int
                AS total
        `;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, [innerLimit, limit, offset]),
            this.dataSource.query(countSql),
        ]);

        return {
            rows: rawRows.map(row => PgMethodologyRepository.mapRow(row)),
            total: countResult[0]?.total ?? 0,
        };
    }

    async findById(id: string): Promise<MethodologyRow | null> {
        const rawRows: RawRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                s.project_count,
                s.instance_project_count,
                s.issuance_count,
                s.instance_issuance_count,
                s.schema_count,
                s.total_issued,
                s.total_retired,
                reg.registry_name,
                (${EFFECTIVE_DECODE_STATUS_LIVE}) AS decode_status,
                p."sourceCid" AS policy_source_cid,
                p."policyMapping"->'sectoralScopes' AS sectoral_scopes,
                p."policyMapping"->'emissionReductionApproach' AS emission_reduction_approach
            FROM business_view bv
            LEFT JOIN ${MV_METHODOLOGY_STATS_NAME} s
                ON s."relatedTopicId" = bv."relatedTopicId"
            ${REGISTRY_NAME_JOIN}
            ${POLICY_DECODE_STATUS_JOIN}
            WHERE bv."viewType" = 'METHODOLOGY'
              AND bv."relatedTopicId" = $1
            ORDER BY bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
            LIMIT 1
            `,
            [id],
        );

        if (rawRows.length === 0) return null;

        const row = rawRows[0];

        const instanceTopicId = row.relatedTopicId;

        // Fetch MintToken VCs for all projects under this methodology instance via project_mint_link, joining
        // through PROJECT rows whose instanceTopicId matches this methodology's relatedTopicId — keeps supply
        // figures consistent with the project detail view and the credits list page.
        let issuances: IssuanceRow[] = [];
        let issuanceEvents: IssuanceEventRow[] = [];
        if (instanceTopicId) {
            const mintRows: Array<{
                token_id: string | null;
                amount: number | null;
                mint_date: Date | null;
                documents: Record<string, any> | null;
                mint_ts: string;
                link_method: string | null;
                vp_ts: string | null;
                minted_amount: string | null;
                serial_count: number | null;
                serial_retired_count: number | null;
                serial_transferred_count: number | null;
                mint_match_status: string | null;
            }> = await this.dataSource.query(
                `SELECT
                    pml.token_id,
                    pml.amount,
                    pml.mint_date,
                    m.documents,
                    pml.mint_consensus_timestamp AS mint_ts,
                    pml.link_method,
                    pml.vp_consensus_timestamp   AS vp_ts,
                    pml.minted_amount,
                    pml.serial_count,
                    pml.serial_retired_count,
                    pml.serial_transferred_count,
                    pml.mint_match_status
                 FROM project_mint_link pml
                 JOIN business_view proj
                     ON proj."projectKey" = pml.project_key
                    AND proj."viewType" = 'PROJECT'
                    AND proj."businessData"->>'instanceTopicId' = $1
                 JOIN message m ON m."consensusTimestamp" = pml.mint_consensus_timestamp
                 WHERE pml.token_id IS NOT NULL
                 ORDER BY pml.mint_date ASC NULLS LAST`,
                [instanceTopicId],
            );

            if (mintRows.length > 0) {
                // Aggregate minted amount per token; keep last MintToken VC as rawVc
                const mintsByToken = new Map<string, { total: number; mintDate: Date | null; rawVc: Record<string, any> | null }>();
                for (const r of mintRows) {
                    if (!r.token_id) continue;
                    const existing = mintsByToken.get(r.token_id) ?? { total: 0, mintDate: r.mint_date, rawVc: r.documents };
                    existing.total += r.amount != null ? Number(r.amount) : 0;
                    existing.rawVc = r.documents;
                    mintsByToken.set(r.token_id, existing);
                }

                const distinctTokenIds = Array.from(mintsByToken.keys());
                const tokenMeta: Array<{
                    tokenId: string;
                    name: string | null;
                    symbol: string | null;
                    type: string | null;
                }> = await this.dataSource.query(
                    `SELECT "tokenId", name, symbol, type
                     FROM token_cache
                     WHERE "tokenId" = ANY($1::varchar[])`,
                    [distinctTokenIds],
                );
                const metaMap = new Map(tokenMeta.map(t => [t.tokenId, t]));

                issuances = [...mintsByToken.entries()].map(([tokenId, data]) => {
                    const meta = metaMap.get(tokenId);
                    return {
                        tokenId,
                        name: meta?.name ?? null,
                        symbol: meta?.symbol ?? null,
                        type: meta?.type ?? null,
                        supply: data.total,
                        mintDate: data.mintDate ? data.mintDate.toISOString().split('T')[0] : null,
                        rawVc: data.rawVc,
                    };
                });

                // Per-mint-event issuance history — one entry per MintToken VC row, ordered oldest-first.
                // Mirrors PgProjectRepository.findById's identical construction so the project detail
                // page and this methodology detail page show the same event-level grain.
                issuanceEvents = mintRows.map(r => {
                    const meta = r.token_id ? metaMap.get(r.token_id) : undefined;
                    return {
                        mintConsensusTimestamp: r.mint_ts,
                        tokenId: r.token_id ?? null,
                        name: meta?.name ?? null,
                        symbol: meta?.symbol ?? null,
                        type: meta?.type ?? null,
                        amount: r.amount != null ? Number(r.amount) : null,
                        mintDate: r.mint_date ? r.mint_date.toISOString().split('T')[0] : null,
                        linkMethod: r.link_method ?? null,
                        rawVc: r.documents ?? null,
                        vpConsensusTimestamp: r.vp_ts ?? null,
                        mintedAmount: r.minted_amount != null ? Number(r.minted_amount) : null,
                        serialCount: r.serial_count != null ? Number(r.serial_count) : null,
                        serialRetiredCount: r.serial_retired_count != null ? Number(r.serial_retired_count) : null,
                        serialTransferredCount: r.serial_transferred_count != null ? Number(r.serial_transferred_count) : null,
                        mintMatchStatus: r.mint_match_status ?? null,
                    };
                });
            }
        }

        // Lifecycle totals come straight from mv_methodology_stats, which the
        // row query above already joins. That view sums mv_project_stats over
        // this methodology's projects, so the detail page and the list agree by
        // construction instead of by two implementations happening to match —
        // the divergence project-stats.mv.ts warns about. mapRow resolves them
        // from the row, and reports nothing when the view has no row for this
        // methodology (no mints), rather than inventing a zero.
        //
        // This used to be recomputed here from nft_cache: every serial a token
        // ever had, and every serial Mirror Node marks deleted. At the token
        // level a direct on-chain mint by whoever holds the supply key is
        // indistinguishable from a Guardian issuance, so that charged the
        // methodology with credits that never went through a policy — in both
        // directions, issued and retired.
        return PgMethodologyRepository.mapRow(row, issuances, undefined, issuanceEvents);
    }

    /** Full filtered, `relatedTopicId`-deduped methodologies dataset for the export engine; batches internally via a LIMIT/OFFSET loop ordered by `sourceTimestamp`. */
    async findAllForExport(filters: MethodologyExportFilters): Promise<MethodologyExportRow[]> {
        const builder = new QueryBuilder(METHODOLOGY_FIELD_SCHEMA);
        // viewType='METHODOLOGY' and the canonical-row dedup are baked into
        // METHODOLOGY_CANDIDATE_CTE below.

        builder.addFilters({
            name: filters.name,
            id: filters.id,
            description: filters.description,
            registryDid: filters.registryDid,
            registryName: filters.registryName,
            version: filters.version,
            policyTopicId: filters.policyTopicId,
        });

        if (filters.decodeStatus?.length) {
            const statuses = filters.decodeStatus;
            const hasUnknown = statuses.includes('unknown');
            const otherStatuses = statuses.filter(s => s !== 'unknown');

            const clauses: string[] = [];
            if (hasUnknown) clauses.push(`(${CANDIDATE_DECODE_STATUS}) IS NULL`);
            if (otherStatuses.length === 1) {
                const p = builder.nextParam(otherStatuses[0]);
                clauses.push(`(${CANDIDATE_DECODE_STATUS}) = ${p}`);
            } else if (otherStatuses.length > 1) {
                const p = builder.nextParam(otherStatuses);
                clauses.push(`(${CANDIDATE_DECODE_STATUS}) = ANY(${p}::text[])`);
            }

            if (clauses.length > 0) {
                builder.addClause(clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`);
            }
        }

        // Keeps an export in step with the list it was requested from.
        const exportLifecycleWhere = lifecycleStatusPredicate(filters.status);
        if (exportLifecycleWhere) {
            builder.addClause(exportLifecycleWhere);
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
                OR similarity(COALESCE(bv."displayName", ''), ${simParam}) > 0.3
            )`);
        }

        const whereSql = builder.getWhereClause();
        const baseParams = builder.getParams();
        const limitParam = `$${baseParams.length + 1}`;
        const offsetParam = `$${baseParams.length + 2}`;

        const rows: MethodologyExportRow[] = [];
        for (let offset = 0; ; offset += EXPORT_BATCH_SIZE) {
            const params = [...baseParams, EXPORT_BATCH_SIZE, offset];

            const batchSql = `
                ${METHODOLOGY_CANDIDATE_CTE}
                SELECT
                    bv."displayName" AS name,
                    bv.registry_name,
                    bv."businessData"->'options'->>'version' AS version,
                    bv.emission_reduction_approach,
                    COALESCE(bv.project_count, 0) AS project_count,
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
            rows.push(...batch.map(PgMethodologyRepository.mapExportRow));

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

    private static mapExportRow(row: RawExportRow): MethodologyExportRow {
        const cids = Array.isArray(row.ipfsCids)
            ? row.ipfsCids.filter((c): c is string => typeof c === 'string' && c.length > 0)
            : [];

        return {
            name: row.name ?? null,
            registry: row.registry_name ?? null,
            version: row.version ?? null,
            mitigation_type: PgMethodologyRepository.extractEmissionReductionApproach(row.emission_reduction_approach),
            // The methodology's own name IS the governing standard at this granularity.
            standard: row.name ?? null,
            project_count: row.project_count != null ? parseInt(row.project_count, 10) : 0,
            ipfs_document_ref: cids.length > 0 ? cids.join('; ') : null,
            // A methodology has no Hedera token, so leave blank rather than fabricate;
            // `_topicId` still resolves a verification_url via the topic fallback.
            _consensusTimestamp: null,
            _tokenId: null,
            _topicId: row.relatedTopicId ?? null,
            _dataSource: row.dataSource ?? null,
        };
    }

    /** `emissionReductionApproach` arrives as a JSONB array of policyMapping entries; the resolved label lives in `entry.schemaName`. Mirrors the inline extraction in `mapRow` below for `findAll`/`findById`. */
    private static extractEmissionReductionApproach(raw: unknown): string | null {
        if (!Array.isArray(raw)) return null;
        for (const entry of raw) {
            if (entry && typeof entry === 'object' && 'schemaName' in entry) {
                const v = (entry as Record<string, unknown>)['schemaName'];
                if (typeof v === 'string' && v) return v;
            }
        }
        return null;
    }

    private static mapRow(
        row: RawRow,
        issuances?: IssuanceRow[],
        lifecycle?: { totalIssued: number; totalRetired: number; totalActive: number },
        issuanceEvents?: IssuanceEventRow[],
    ): MethodologyRow {
        // findById passes lifecycle explicitly; findAll supplies it via the LIFECYCLE_JOIN lateral columns on the raw row.
        const resolvedLifecycle = lifecycle ?? (row.total_issued != null
            ? (() => {
                // parseFloat: total_issued is NUMERIC, so fungible fractions survive.
                const issued = parseFloat(row.total_issued!);
                const retired = parseInt(row.total_retired ?? '0', 10);
                return { totalIssued: issued, totalRetired: retired, totalActive: issued - retired };
            })()
            : undefined);

        const stats: MethodologyStatsRow = {
            projectCount: parseInt(row.project_count || '0', 10),
            instanceProjectCount: parseInt(row.instance_project_count || '0', 10),
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            instanceIssuanceCount: parseInt(row.instance_issuance_count || '0', 10),
            schemaCount: parseInt(row.schema_count || '0', 10),
        };

        const data = row.businessData || {};
        const description = typeof data.description === 'string' ? data.description : null;
        const statusValue = typeof data.status === 'string' ? data.status : null;

        // sectoralScopes arrives as a JSONB array of policyMapping entries, each with a `schemaName` field holding the scope value.
        let sectoralScopes: string[] | null = null;
        if (Array.isArray(row.sectoral_scopes)) {
            const scopes: string[] = [];
            for (const entry of row.sectoral_scopes as unknown[]) {
                if (entry && typeof entry === 'object') {
                    const val = (entry as Record<string, unknown>)['schemaName'];
                    if (typeof val === 'string' && val) scopes.push(val);
                }
            }
            if (scopes.length > 0) sectoralScopes = scopes;
        }
        // emissionReductionApproach arrives as a JSONB array of policyMapping entries; the resolved label lives in entry.schemaName (first non-empty value).
        let emissionReductionApproach: string | null = null;
        if (Array.isArray(row.emission_reduction_approach)) {
            for (const entry of row.emission_reduction_approach as unknown[]) {
                if (entry && typeof entry === 'object' && 'schemaName' in entry) {
                    const v = (entry as Record<string, unknown>)['schemaName'];
                    if (typeof v === 'string' && v) { emissionReductionApproach = v; break; }
                }
            }
        }

        return {
            id: row.id,
            viewType: row.viewType,
            sourceTimestamp: row.sourceTimestamp,
            registryDid: row.registryDid,
            registryName: row.registry_name,
            relatedTopicId: row.relatedTopicId,
            displayName: row.displayName,
            description,
            statusValue,
            sectoralScopes,
            emissionReductionApproach,
            businessData: row.businessData,
            searchText: row.searchText,
            lastUpdate: row.lastUpdate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            stats,
            issuances,
            issuanceEvents: issuanceEvents ?? [],
            totalIssued: resolvedLifecycle?.totalIssued,
            totalRetired: resolvedLifecycle?.totalRetired,
            totalActive: resolvedLifecycle?.totalActive,
            decodeStatus: row.decode_status ?? null,
            policySourceCid: row.policy_source_cid ?? null,
            discontinuedAt: typeof data.discontinuedAt === 'string' ? data.discontinuedAt : null,
        };
    }
}
