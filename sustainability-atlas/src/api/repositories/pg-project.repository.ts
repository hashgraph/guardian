import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MV_PROJECT_STATS_NAME, MV_PROJECT_LIFECYCLE_NAME, MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import {
    ProjectRepository,
    ProjectListQuery,
    ProjectListResult,
    ProjectRow,
    IssuanceRow,
    IssuanceEventRow,
    ActivityEventRow,
    PolicySchemaRow,
    ProjectExportFilters,
    ProjectExportRow,
    ProjectFilterOptionsRow,
    MethodologyFilterOptionRow,
    SerialRangeRow,
    MintSerialsResult,
    MintTransactionsResult,
} from './project.repository';
import { QueryBuilder, MAX_MULTI_VALUE_PARTS } from './query-builder';
import { PROJECT_FIELD_SCHEMA } from './schemas/project.schema';
import { OTHER_COUNTRY_FILTER_VALUE, RECOGNIZED_COUNTRY_TOKENS, COUNTRY_TOKEN_TO_CODE, CODE_TO_ALIASES } from './schemas/recognized-countries';
import { collectExternalDataBlockSchemas } from '../services/policy-graph.builder';

type GeoJsonPolygonType = 'Polygon' | 'MultiPolygon';

/** Batch size for the internally-batched `findAllForExport` LIMIT/OFFSET loop. */
const EXPORT_BATCH_SIZE = 2000;

/** Ceiling on rows a single export may stream; exceeding it throws rather than truncating. */
const EXPORT_MAX_ROWS = 100_000;

/**
 * `businessData.country`, trimmed of the whitespace classes JS's String.trim()
 * strips but a plain SQL TRIM() (and Postgres's regex `\s` class) does not —
 * notably a non-breaking space (U+00A0), a stray BOM (U+FEFF), and several
 * other Unicode space separators (e.g. U+202F narrow no-break space, a
 * common copy/paste artifact from Word/PDF-sourced registry text) that
 * Postgres's `\s` doesn't cover but ECMAScript's WhiteSpace/LineTerminator
 * production does. Without this, a country value with one of these trailing
 * chars (invisible in most editors) passes the frontend's resolveCountryCode
 * (re-trimmed with JS on every render, so it displays as "Peru" with the
 * correct flag) but fails every match here, landing the project in the
 * "Other" bucket instead.
 */
const TRIMMED_COUNTRY_SQL =
    `regexp_replace(bv."businessData"->>'country', '^[\\t\\n\\v\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+|[\\t\\n\\v\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+$', '', 'g')`;

/** Raw row shape for `findAllForExport` (see `ProjectExportRow` doc). */
interface RawExportRow {
    project_name: string | null;
    registry_name: string | null;
    developer: string | null;
    country: string | null;
    total_issued: string | null;
    vintage: string | null;
    creditingPeriodStart: string | null;
    standard: string | null;
    mitigation_type_raw: unknown;
    sdgs: number[] | null;
    relatedTopicId: string | null;
    dataSource: string | null;
    ipfsCids: string[] | null;
}

interface RawRow {
    id: string;
    sourceTimestamp: string;
    projectKey: string | null;
    registryDid: string | null;
    relatedTopicId: string | null;
    displayName: string | null;
    businessData: Record<string, any> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    registry_name: string | null;
    issuance_count: number | null;
    // pg returns bigint/numeric columns as strings
    total_issued: string | null;
    total_declared?: string | null;
    total_retired: string | null;
    // mv_project_lifecycle-sourced (findAll's rowsSql only — findById never
    // joins it, so these are undefined there).
    lifecycleStage?: string | null;
    expectedIssuanceYear?: string | null;
}

// business_view."searchVector" is a STORED generated column with this exact
// expression (see schema-bootstrap.ts) — referencing it directly, rather than
// recomputing the expression inline, lets the planner match it back to
// idx_business_view_search_vector (GIN). An inline recompute is opaque to the
// planner even though it's byte-identical, so it was never reaching that index.
const SEARCH_TSVECTOR = `bv."searchVector"`;

/**
 * Joined into both findAll and findById to look up the publishing registry's
 * display name. Read from `mv_registry_stats`, which resolves the latest
 * REGISTRY row per registryDid once per MV refresh; keyed by registryDid
 * (unique index), so this is a cheap lookup rather than a per-request scan.
 */
const REGISTRY_NAME_JOIN = `
    LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg ON reg."registryDid" = bv."registryDid"
`;

/** Per-project lifecycle aggregates (issuance count, total issued, total retired) are read from the mv_project_stats materialized view instead of being computed live per row; the MV is keyed by projectKey and refreshed by MvRefreshProcessor. */
const PROJECT_STATS_JOIN = `
    LEFT JOIN ${MV_PROJECT_STATS_NAME} ps
        ON ps."projectKey" = bv."projectKey"
`;

/** Precomputed lifecycle stage / expected issuance year — see mv_project_lifecycle. Used for list filtering/sorting; findById does not join this (it computes the richer per-VC detail live). */
const PROJECT_LIFECYCLE_JOIN = `
    LEFT JOIN ${MV_PROJECT_LIFECYCLE_NAME} lc
        ON lc."projectKey" = bv."projectKey"
`;

/** LATERAL: resolve the project's methodology (by instance topic match, with a displayName fallback) plus its `emissionReductionApproach`, mirroring `PgMethodologyRepository`/`PgCreditRepository`'s identical lookups. Used only by `findAllForExport` for the `mitigation_type`/`standard` catalog columns. */
const METHODOLOGY_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            bv_meth."displayName" AS methodology_name,
            (
                SELECT p."policyMapping"->'emissionReductionApproach'
                FROM policy p
                WHERE p."policyTopicId" = bv_meth."businessData"->>'topicId'
                  AND p."decodeStatus" = 'decoded'
                ORDER BY p."updatedAt" DESC NULLS LAST
                LIMIT 1
            ) AS emission_reduction_approach
        FROM business_view bv_meth
        WHERE bv_meth."viewType" = 'METHODOLOGY'
          AND (
              bv_meth."relatedTopicId" = bv."businessData"->>'instanceTopicId'
              OR bv_meth."displayName" = bv."businessData"->>'methodology'
          )
        ORDER BY
            (bv_meth."relatedTopicId" = bv."businessData"->>'instanceTopicId') DESC,
            bv_meth."sourceTimestamp"::numeric DESC NULLS LAST,
            bv_meth."createdAt" DESC NULLS LAST
        LIMIT 1
    ) meth ON true
`;

/** The `message` row backing this PROJECT's own originating VC (`business_view.sourceTimestamp` = `message.consensusTimestamp`), supplying `source_system_id`/`ipfs_document_ref` for `findAllForExport`. */
const SOURCE_MESSAGE_JOIN = `
    LEFT JOIN message src_msg ON src_msg."consensusTimestamp" = bv."sourceTimestamp"
`;

/** PostgreSQL implementation of the ProjectRepository; generic filter/sort logic is delegated to QueryBuilder + PROJECT_FIELD_SCHEMA, while full-text search and ranking remain explicit since they don't fit the generic operator model. */
export class PgProjectRepository extends ProjectRepository {
    // Per-network (keyed by DataSource) cache of policy schema metadata used to classify linkedVcs on list rows.
    // The repository is instantiated per-call, so this must live on the class, not `this`; invalidated whenever
    // `sig` (a cheap aggregate over the policy table) changes — see findAll() below.
    private static readonly schemaCache = new WeakMap<DataSource, {
        sig: string;
        byTopic: Map<string, PolicySchemaRow[]>;
    }>();

    constructor(private readonly dataSource: DataSource) {
        super();
    }

    /**
     * Builds the `country` filter's WHERE clause. A raw stored country can be
     * any free-text variant of the same place ("MEX", "Mexico", "mexico"),
     * so this doesn't do a literal ILIKE per selected value — it resolves
     * each selected value to a canonical alpha-3 code (via
     * COUNTRY_TOKEN_TO_CODE, matching frontend/composables/useProjects.ts's
     * resolveCountryCode) and matches every raw form on record for that code
     * (CODE_TO_ALIASES), so selecting "Mexico" also catches projects stored
     * as "MEX". The `__other__` sentinel (see recognized-countries.ts) means
     * "every project whose country isn't a recognized ISO name/alpha-3 code"
     * — this includes both a non-empty-but-unrecognized value AND a missing
     * one (null/empty, shown as "—" in the UI), so the "Other" bucket and
     * filter agree with each other: every project not claimed by a specific
     * country lands in exactly one of them. A NOT-IN-list clause, since
     * ILIKE can't express it. The filter is multi-select, so selections
     * arrive `|`-joined (same
     * convention as QueryBuilder's other multi-value filters, e.g.
     * `__other__|MEX`) and need OR, not AND, semantics — this builds the
     * full OR'd clause itself (mirroring QueryBuilder's private
     * decodeMultiValue) and adds it directly, always consuming the value:
     * returns undefined so the generic per-field ilike filter never also
     * runs on it.
     */
    private applyCountryFilter(builder: QueryBuilder, country: string | undefined): string | undefined {
        if (!country) return country;
        const parts = country.split('|').map(p => {
            try { return decodeURIComponent(p.trim()); } catch { return p.trim(); }
        }).filter(Boolean);
        if (parts.length === 0) return country;

        if (parts.length > MAX_MULTI_VALUE_PARTS) {
            throw new BadRequestException(
                `Too many multi-value filter parts: received ${parts.length}, maximum allowed is ${MAX_MULTI_VALUE_PARTS}.`,
            );
        }

        const clauses: string[] = [];
        for (const p of parts) {
            if (p === OTHER_COUNTRY_FILTER_VALUE) {
                const tokens = builder.nextParam(RECOGNIZED_COUNTRY_TOKENS);
                // A row whose stored country is unrecognized but has been
                // reverse-geocoded from its coordinates (businessData.geoCountryCode
                // — see scripts/backfill-geo-country-code.ts and the write-time
                // fallback in project-mapper.service.ts) has a known country even
                // though the raw text doesn't reflect it, so it's excluded from
                // "Other" here and instead matched by that code below.
                clauses.push(
                    `((NULLIF(${TRIMMED_COUNTRY_SQL}, '') IS NULL ` +
                    `OR LOWER(${TRIMMED_COUNTRY_SQL}) <> ALL(${tokens}::text[])) ` +
                    `AND bv."businessData"->>'geoCountryCode' IS NULL)`,
                );
                continue;
            }

            const code = COUNTRY_TOKEN_TO_CODE[p.toLowerCase()];
            if (code) {
                const aliases = builder.nextParam(CODE_TO_ALIASES[code] ?? [p.toLowerCase()]);
                // OR-in a match against the reverse-geocoded code so a project whose
                // stored country text never resolved (garbage/mis-mapped field) but
                // was recovered from its coordinates is still selectable by that
                // recovered country, not just by "Other".
                const geoCode = builder.nextParam(code);
                clauses.push(
                    `(LOWER(${TRIMMED_COUNTRY_SQL}) = ANY(${aliases}::text[]) ` +
                    `OR bv."businessData"->>'geoCountryCode' = ${geoCode})`,
                );
            } else {
                // Not a recognized token — a legacy/arbitrary value (e.g. an
                // old bookmarked link). Fall back to the previous substring
                // behavior so it still matches something rather than nothing.
                const param = builder.nextParam(`%${p}%`);
                clauses.push(`bv."businessData"->>'country' ILIKE ${param}`);
            }
        }
        builder.addClause(`(${clauses.join(' OR ')})`);
        return undefined;
    }

    async findAll(query: ProjectListQuery): Promise<ProjectListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(PROJECT_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'PROJECT'`);

        // Generic filters: every filterable field defined in the schema is wired automatically.
        builder.addFilters({
            name: query.name,
            country: this.applyCountryFilter(builder, query.country),
            methodology: query.methodology,
            registry: query.registry,
            registryDid: query.registryDid,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
            policyTopicId: query.policyTopicId,
            instanceTopicId: query.instanceTopicId,
            sourceTimestamp: query.sourceTimestamps,
            sdgs: query.sdgs,
            sector: query.sector,
            sectoralScope: query.sectoralScope,
            vintageYear: query.vintageRange,
            lifecycleStage: query.lifecycleStage,
            expectedIssuanceYear: query.expectedIssuanceYearRange,
        });

        // Scoped-view deep link: matches instanceTopicId OR policyTopicId —
        // not expressible via the generic AND-only per-field filter model.
        if (query.methodologyId) {
            const p = builder.nextParam(query.methodologyId);
            builder.addClause(`(bv."businessData"->>'instanceTopicId' = ${p} OR bv."businessData"->>'policyTopicId' = ${p})`);
        }

        // `isPipeline` has no own column — it's the negation of "issued" that
        // mv_project_lifecycle already resolved into lifecycle_stage. Fixed
        // literal comparison, no injected value, no param needed.
        if (query.isPipeline === 'true') {
            builder.addClause(`lc.lifecycle_stage != 'Issued'`);
        } else if (query.isPipeline === 'false') {
            builder.addClause(`lc.lifecycle_stage = 'Issued'`); 
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

        const rowsSql = `
            SELECT
                bv."id",
                bv."viewType",
                bv."sourceTimestamp",
                bv."registryDid",
                bv."relatedTopicId",
                bv."displayName",
                bv."businessData" - 'metadata' - 'decodeMethod' - 'topicId' - 'vcCount' - 'policyTopicId' - 'instanceTopicId' AS "businessData",
                bv."searchText",
                bv."projectKey",
                bv."lastUpdate",
                bv."createdAt",
                bv."updatedAt",
                reg.registry_name,
                COALESCE(ps.issuance_count, 0) AS issuance_count,
                COALESCE(ps.total_issued, 0)   AS total_issued,
                COALESCE(ps.total_declared, 0) AS total_declared,
                COALESCE(ps.total_retired, 0)  AS total_retired,
                lc.lifecycle_stage             AS "lifecycleStage",
                lc.expected_issuance_year      AS "expectedIssuanceYear",
                ${rankExpr} AS search_rank
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            ${PROJECT_STATS_JOIN}
            ${PROJECT_LIFECYCLE_JOIN}
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE but skips LIMIT/OFFSET; joins are only
        // included when a filter actually references them, avoiding their cost on
        // large unfiltered PROJECT sets.
        const countParams = params.slice(0, params.length - 2);
        const countJoin = [
            query.registry ? REGISTRY_NAME_JOIN : '',
            (query.lifecycleStage || query.expectedIssuanceYearRange || query.isPipeline) ? PROJECT_LIFECYCLE_JOIN : '',
        ].join('\n');
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            ${countJoin}
            WHERE ${whereSql}
        `;

        // Summary aggregates for the current filter set (issuances/countries/registries
        // shown in the results banner) — reuses the same WHERE the count query does.
        // Always includes every join (unlike countSql's conditional joins) since
        // whereSql can reference any of reg/ps/lc regardless of which filter fired,
        // and omitting one here throws "missing FROM-clause entry" the moment a
        // filter that needs it is active.
        const summarySql = `
            SELECT
                SUM(COALESCE(ps.issuance_count, 0))::bigint                        AS total_issuances,
                -- Prefer the reverse-geocoded code (businessData.geoCountryCode)
                -- over the raw stored country when present, so a project whose
                -- country text never resolved but was recovered from its
                -- coordinates counts once under its real country instead of
                -- inflating this total as its own distinct "country".
                COUNT(DISTINCT NULLIF(COALESCE(bv."businessData"->>'geoCountryCode', bv."businessData"->>'country'), ''))::int AS unique_countries,
                COUNT(DISTINCT reg.registry_name)::int                             AS unique_registries
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            ${PROJECT_STATS_JOIN}
            ${PROJECT_LIFECYCLE_JOIN}
            WHERE ${whereSql}
        `;

        // count/summary re-run the same whereSql as rows and are invariant across
        // pages of one search — when the caller already has a cached value for
        // this exact filter set, skip re-running both and pay the predicate cost
        // once (for rows) instead of three times.
        const [rawRows, countResult, summaryResult]: [
            RawRow[],
            Array<{ total: number }> | undefined,
            Array<{ total_issuances: string | null; unique_countries: number; unique_registries: number }> | undefined,
        ] = query.cachedCountAndSummary
            ? [await this.dataSource.query(rowsSql, params), undefined, undefined]
            : await Promise.all([
                this.dataSource.query(rowsSql, params),
                this.dataSource.query(countSql, countParams),
                this.dataSource.query(summarySql, countParams),
            ]);

        // Batch-loads each distinct policy's schema names + policyMapping in one indexed query (names extracted
        // SQL-side, so heavyweight rawSchemaJson bodies never leave Postgres), mirroring findById.
        const policyTopicIds = [...new Set(
            rawRows
                .map((r) => (r.businessData as Record<string, any> | null)?.['policyTopicId'])
                .filter((t): t is string => typeof t === 'string' && t.length > 0),
        )];
        // Schema metadata is essentially static, so it's cached per-network keyed by DataSource and only
        // refetched for referenced-but-uncached topics; freshness is kept by a cheap count+max(updatedAt) signature.
        let schemasByTopic = new Map<string, PolicySchemaRow[]>();
        if (policyTopicIds.length > 0) {
            const [sigRow]: Array<{ c: number; m: string }> = await this.dataSource.query(
                `SELECT count(*)::int AS c, COALESCE(max("updatedAt")::text, '0') AS m
                 FROM policy WHERE "decodeStatus" = 'decoded'`,
            );
            const sig = `${sigRow?.c ?? 0}:${sigRow?.m ?? '0'}`;

            let entry = PgProjectRepository.schemaCache.get(this.dataSource);
            if (!entry || entry.sig !== sig) {
                entry = { sig, byTopic: new Map<string, PolicySchemaRow[]>() };
                PgProjectRepository.schemaCache.set(this.dataSource, entry);
            }

            const missing = policyTopicIds.filter((t) => !entry!.byTopic.has(t));
            if (missing.length > 0) {
                const policyRows: Array<{
                    policyTopicId: string;
                    policyMapping: Record<string, unknown> | null;
                    schema_names: Record<string, unknown> | null;
                }> = await this.dataSource.query(
                    `SELECT DISTINCT ON (p."policyTopicId")
                            p."policyTopicId",
                            p."policyMapping",
                            (SELECT jsonb_object_agg(s.key, s.value->'name')
                               FROM jsonb_each(COALESCE(p."rawSchemaJson", '{}'::jsonb)) s) AS schema_names
                     FROM policy p
                     WHERE p."policyTopicId" = ANY($1::varchar[])
                       AND p."decodeStatus" = 'decoded'
                     ORDER BY p."policyTopicId", p."createdAt" DESC`,
                    [missing],
                );
                for (const pr of policyRows) {
                    const schemaNamesByIri = new Map<string, string | null>();
                    for (const [iri, name] of Object.entries(pr.schema_names ?? {})) {
                        schemaNamesByIri.set(iri, typeof name === 'string' ? name : null);
                    }
                    entry.byTopic.set(pr.policyTopicId, PgProjectRepository.buildPolicySchemas(
                        schemaNamesByIri,
                        (pr.policyMapping ?? {}) as Record<string, unknown[]>,
                    ));
                }
            }

            schemasByTopic = entry.byTopic;
        }

        return {
            rows: rawRows.map((row) => PgProjectRepository.mapRow(
                row,
                undefined,
                undefined,
                schemasByTopic.get((row.businessData as Record<string, any> | null)?.['policyTopicId'] ?? ''),
            )),
            total: query.cachedCountAndSummary?.total ?? countResult?.[0]?.total ?? 0,
            summary: query.cachedCountAndSummary?.summary ?? {
                totalIssuances: Number(summaryResult?.[0]?.total_issuances ?? 0),
                uniqueCountries: summaryResult?.[0]?.unique_countries ?? 0,
                uniqueRegistries: summaryResult?.[0]?.unique_registries ?? 0,
            },
        };
    }

    async findById(id: string): Promise<ProjectRow | null> {
        // Accept either the row's sourceTimestamp (legacy ID used by the /projects list page) or the projectKey (credentialSubject.id, used by the credits page links).
        const rawRows: RawRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                reg.registry_name
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            WHERE bv."viewType" = 'PROJECT'
              AND (bv."sourceTimestamp" = $1 OR bv."projectKey" = $1)
            LIMIT 1
            `,
            [id],
        );

        if (rawRows.length === 0) return null;

        const row = rawRows[0];
        const policyTopicId = (row.businessData as Record<string, any> | null)?.['policyTopicId'] as string | null;
        const instanceTopicId = row.relatedTopicId;

        // The three branches below share no data dependency on each other — only
        // on the row already fetched above — so they run concurrently instead of
        // as a 6-deep sequential chain (each was previously await'ed one after
        // another purely by code placement, not because it needed a prior
        // branch's result).
        const [issuanceData, policySchemas, polygon] = await Promise.all([
            this.resolveIssuances(row.projectKey, instanceTopicId),
            this.resolvePolicySchemas(policyTopicId),
            this.resolveGeometry(row.projectKey),
        ]);

        const { issuances, issuanceEvents, totalIssued, totalDeclared, totalRetired, totalTransferred, issuanceCount } = issuanceData;
        const totalActive = totalIssued - totalRetired;

        return PgProjectRepository.mapRow(row, issuances, { totalIssued, totalDeclared, totalRetired, totalActive, totalTransferred }, policySchemas, issuanceEvents, issuanceCount, polygon);
    }

    /**
     * Per-project mint attribution via project_mint_link: the linker pre-resolves each MintToken to
     * its specific project by walking options.relationships, so this is correct even for grouped projects
     * that share one instance topic.
     */
    private async resolveIssuances(
        projectKey: string | null,
        instanceTopicId: string | null,
    ): Promise<{
        issuances: IssuanceRow[];
        issuanceEvents: IssuanceEventRow[];
        totalIssued: number;
        totalDeclared: number;
        totalRetired: number;
        totalTransferred: number | null;
        issuanceCount: number;
    }> {
        let issuances: IssuanceRow[] = [];
        let issuanceEvents: IssuanceEventRow[] = [];
        let totalIssued = 0;
        let totalDeclared = 0;
        // Null until proven otherwise: transfers are unknowable for fungible
        // credits and for serials whose ownership hasn't synced yet.
        let totalTransferred: number | null = null;
        let totalRetired = 0;

        const [mintTokenRows, issuanceCountRows]: [
            Array<{
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
            }>,
            Array<{ count: number }>,
        ] = await Promise.all([
            this.dataSource.query(
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
                 JOIN message m ON m."consensusTimestamp" = pml.mint_consensus_timestamp
                 WHERE pml.project_key = $1
                 ORDER BY pml.mint_date ASC NULLS LAST`,
                [projectKey],
            ),
            this.dataSource.query(
                `SELECT COUNT(*) FILTER (WHERE token_id IS NOT NULL)::int AS count
                 FROM project_mint_link
                 WHERE project_key = $1`,
                [projectKey],
            ),
        ]);
        let issuanceCount = issuanceCountRows[0]?.count ?? 0;

        if (mintTokenRows.length > 0) {
            // Aggregate minted amount per token; keep last MintToken VC as raw data.
            // Prefer what the ledger actually minted, falling back to the VC's
            // declared amount while a mint is still unreconciled — same rule as
            // mv_project_stats.total_issued, so detail and list agree.
            const mintsByToken = new Map<string, { total: number; declared: number; mintDate: Date | null; rawVc: Record<string, any> | null }>();
            for (const r of mintTokenRows) {
                if (!r.token_id) continue;
                const declared = r.amount != null ? Number(r.amount) : 0;
                const minted = r.minted_amount != null ? Number(r.minted_amount) : declared;
                const existing = mintsByToken.get(r.token_id) ?? { total: 0, declared: 0, mintDate: r.mint_date, rawVc: r.documents };
                existing.total += minted;
                existing.declared += declared;
                existing.rawVc = r.documents;
                mintsByToken.set(r.token_id, existing);
            }

            // Enrich with token metadata from token_cache
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
                    mintDate: data.mintDate
                        ? data.mintDate.toISOString().split('T')[0]
                        : null,
                    rawVc: data.rawVc,
                };
            });

            // Per-mint-event issuance history — one entry per MintToken VC row, ordered oldest-first.
            issuanceEvents = mintTokenRows.map(r => {
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

            // totalIssued = what the ledger minted; totalDeclared = what the
            // MintToken VCs claimed. They diverge whenever a mint partially failed.
            totalIssued = [...mintsByToken.values()].reduce((s, v) => s + v.total, 0);
            totalDeclared = [...mintsByToken.values()].reduce((s, v) => s + v.declared, 0);

            // Retirement, verified evidence only — same rule as
            // mv_project_stats.total_retired, so list and detail agree.
            //
            // Retired serials this project's own mint events account for are
            // summed per mint (exact, and per vintage). Orphan serials — deleted
            // on-chain but matching no mint link — are deliberately excluded:
            // nothing ties them to a policy, so they are not provably Guardian
            // issuances. The only residue is documented fungible retirement,
            // which is token-level by nature.
            totalRetired = issuanceEvents.reduce((s, e) => s + (e.serialRetiredCount ?? 0), 0);
            // Transfers are only knowable per serial, so this covers non-fungible
            // credits attributed to a mint event. Fungible balances can't be
            // traced back to the mint that created them.
            //
            // Stays null unless every non-fungible mint has a known figure: one
            // mint whose serial ownership is still syncing would otherwise drag
            // the project total down to a number that looks precise and isn't.
            const nftEvents = issuanceEvents.filter(e => e.type === 'NON_FUNGIBLE_UNIQUE');
            totalTransferred = nftEvents.length > 0 && nftEvents.every(e => e.serialTransferredCount !== null)
                ? nftEvents.reduce((s, e) => s + (e.serialTransferredCount ?? 0), 0)
                : null;

            const projectTokenIds = [...new Set(
                issuanceEvents.map(e => e.tokenId).filter((t): t is string => !!t),
            )];

            if (projectTokenIds.length > 0) {
                // Fungible retirement is only charged for tokens this project
                // alone mints — when several projects share a token there is no
                // way to say whose credits were retired, and counting it for each
                // would report one retirement several times.
                const [residue]: Array<{ retired: string }> = await this.dataSource.query(
                    `WITH sole AS (
                        SELECT pml.token_id
                        FROM project_mint_link pml
                        WHERE pml.token_id = ANY($1::varchar[])
                        GROUP BY pml.token_id
                        HAVING COUNT(DISTINCT pml.project_key) = 1
                     )
                     SELECT COALESCE((
                        SELECT SUM(tre.amount / (10::numeric ^ COALESCE(tc.decimals, 0)))
                        FROM token_retire_event tre
                        JOIN token_cache tc
                          ON tc."tokenId" = tre.token_id AND tc.type = 'FUNGIBLE_COMMON'
                        WHERE tre.token_id IN (SELECT token_id FROM sole) AND tre.amount IS NOT NULL
                     ), 0)::text AS retired`,
                    [projectTokenIds],
                );
                totalRetired += parseFloat(residue?.retired ?? '0');
            }
        } else if (instanceTopicId) {
            // Step 2 fallback: look up CREDIT rows linked to this project's own instance topic only (excluding
            // policyTopicId, since sibling projects share it), and only when this is the sole PROJECT on that
            // topic — otherwise credits would be cross-attributed to every sibling project. Mirrors
            // mint-project-linker.ts's fallback guard.
            const siblingCountRows: Array<{ count: string }> = await this.dataSource.query(
                `SELECT COUNT(*)::text AS count
                 FROM business_view
                 WHERE "viewType" = 'PROJECT'
                   AND "relatedTopicId" = $1`,
                [instanceTopicId],
            );
            const siblingCount = parseInt(siblingCountRows[0]?.count ?? '0', 10);

            if (siblingCount > 1) {
                // Shared topic — cannot safely attribute credits to this project alone.
            } else {
                const creditRows: Array<{
                    tokenId: string | null;
                    name: string | null;
                    symbol: string | null;
                    type: string | null;
                    supply: string | null;
                    mintDate: Date | null;
                }> = await this.dataSource.query(
                    `SELECT
                    COALESCE(tc."tokenId", bv."businessData"->>'tokenId') AS "tokenId",
                    COALESCE(tc.name,      bv."displayName")              AS name,
                    COALESCE(tc.symbol,    bv."businessData"->>'symbol')  AS symbol,
                    tc.type,
                    -- Fungible supply is stored in the token's smallest units;
                    -- scale by decimals so it is comparable with VC amounts.
                    (tc."totalSupply" / (10::numeric ^ COALESCE(tc.decimals, 0)))::text AS supply,
                    bv."createdAt"                                        AS "mintDate"
                 FROM business_view bv
                 LEFT JOIN token_cache tc
                     ON tc."tokenId" = bv."businessData"->>'tokenId'
                 WHERE bv."viewType" = 'CREDIT'
                   AND bv."relatedTopicId" = $1
                 ORDER BY bv."createdAt" ASC`,
                    [instanceTopicId],
                );

                issuances = creditRows.map(r => ({
                    tokenId: r.tokenId ?? '',
                    name: r.name ?? null,
                    symbol: r.symbol ?? null,
                    type: r.type ?? null,
                    supply: r.supply != null ? parseFloat(r.supply) : 0,
                    mintDate: r.mintDate ? r.mintDate.toISOString().split('T')[0] : null,
                }));

                const nftTokenIds = issuances
                    .filter(i => i.type === 'NON_FUNGIBLE_UNIQUE')
                    .map(i => i.tokenId)
                    .filter((tid): tid is string => !!tid);

                if (nftTokenIds.length > 0) {
                    const nftStats: Array<{ tokenId: string; total_minted: string; total_retired: string }> =
                        await this.dataSource.query(
                            `SELECT "tokenId",
                                COUNT(*)::text                               AS total_minted,
                                COUNT(*) FILTER (WHERE deleted = true)::text AS total_retired
                         FROM nft_cache
                         WHERE "tokenId" = ANY($1::varchar[])
                         GROUP BY "tokenId"`,
                            [nftTokenIds],
                        );
                    for (const s of nftStats) {
                        totalIssued += parseInt(s.total_minted, 10);
                        totalRetired += parseInt(s.total_retired, 10);
                    }
                }
                // Fungible: prefer the summed on-chain mint transactions — token
                // supply is net of any wipes, so it understates what was minted.
                const ftTokenIds = issuances
                    .filter(i => i.type !== 'NON_FUNGIBLE_UNIQUE')
                    .map(i => i.tokenId)
                    .filter((tid): tid is string => !!tid);
                const mintedByToken = new Map<string, number>();
                if (ftTokenIds.length > 0) {
                    const ftStats: Array<{ token_id: string; minted: string }> = await this.dataSource.query(
                        `SELECT t.token_id,
                                (SUM(t.amount_raw) / (10::numeric ^ COALESCE(tc.decimals, 0)))::text AS minted
                         FROM token_mint_tx t
                         JOIN token_cache tc ON tc."tokenId" = t.token_id
                         WHERE t.token_id = ANY($1::varchar[])
                         GROUP BY t.token_id, tc.decimals`,
                        [ftTokenIds],
                    );
                    for (const s of ftStats) {
                        mintedByToken.set(s.token_id, parseFloat(s.minted));
                    }
                }
                for (const i of issuances) {
                    if (i.type !== 'NON_FUNGIBLE_UNIQUE') {
                        totalIssued += mintedByToken.get(i.tokenId) ?? i.supply;
                    }
                }
                // No MintToken VCs on this path, so nothing was declared to compare against.
                totalDeclared = totalIssued;
            } // end else (siblingCount === 1)
        }

        if (issuanceCount === 0 && issuances.length > 0) issuanceCount = issuances.length;

        return { issuances, issuanceEvents, totalIssued, totalDeclared, totalRetired, totalTransferred, issuanceCount };
    }

    /** Schema metadata for this project's policyTopicId so the DTO can render a grouped linked-VCs view. Independent of resolveIssuances — only needs policyTopicId, already known from the row query. */
    private async resolvePolicySchemas(policyTopicId: string | null): Promise<PolicySchemaRow[]> {
        if (!policyTopicId) return [];

        const policySchemaRows: Array<{
            policyTopicId: string;
            sourceCid: string;
            rawSchemaJson: Record<string, unknown> | null;
            rawPolicyJson: Record<string, unknown> | null;
            policyMapping: Record<string, unknown> | null;
            createdAt: Date;
            updatedAt: Date;
        }> = await this.dataSource.query(
            `SELECT "policyTopicId", "sourceCid", "rawSchemaJson", "rawPolicyJson", "policyMapping", "createdAt", "updatedAt"
             FROM policy
             WHERE "policyTopicId" = $1
               AND "decodeStatus" = 'decoded'
             ORDER BY "createdAt" DESC
             LIMIT 1`,
            [policyTopicId],
        );

        if (policySchemaRows.length === 0) return [];

        const pr = policySchemaRows[0];
        const rawSchemaJson = (pr.rawSchemaJson ?? {}) as Record<string, unknown>;
        const schemaNamesByIri = new Map<string, string | null>();
        for (const [iri, schemaDoc] of Object.entries(rawSchemaJson)) {
            const doc = (schemaDoc ?? {}) as Record<string, unknown>;
            schemaNamesByIri.set(iri, typeof doc['name'] === 'string' ? doc['name'] : null);
        }
        const mrvSchemaUuids = collectExternalDataBlockSchemas(pr.rawPolicyJson);
        return PgProjectRepository.buildPolicySchemas(
            schemaNamesByIri,
            (pr.policyMapping ?? {}) as Record<string, unknown[]>,
            mrvSchemaUuids,
        );
    }

    /**
     * Full-precision boundary lives in its own table (see schema-bootstrap.ts
     * for why) — sent to the frontend as-is, no point dropped. It's kept
     * out of businessData specifically so this full-detail read never
     * costs anything on the list/search path; it's a one-row lookup by
     * primary key on this single project-detail fetch. Independent of
     * resolveIssuances/resolvePolicySchemas — only needs projectKey, already
     * known from the row query.
     */
    private async resolveGeometry(projectKey: string | null): Promise<string | null> {
        if (!projectKey) return null;

        const geometryRows: Array<{ geo_type: GeoJsonPolygonType; geojson: { coordinates: unknown } }> =
            await this.dataSource.query(
                `SELECT geo_type, geojson FROM project_geometry WHERE project_key = $1 LIMIT 1`,
                [projectKey],
            );
        if (geometryRows.length === 0) return null;

        const { geo_type, geojson } = geometryRows[0];
        return JSON.stringify({ type: geo_type, coordinates: geojson.coordinates });
    }

    async findActivity(sourceTimestamp: string): Promise<ActivityEventRow[]> {
        const projectRows: Array<{ relatedTopicId: string | null; businessData: Record<string, any> | null }> = await this.dataSource.query(
            `SELECT "relatedTopicId", "businessData"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND "sourceTimestamp" = $1
             LIMIT 1`,
            [sourceTimestamp],
        );

        if (projectRows.length === 0 || !projectRows[0].relatedTopicId) return [];

        const topicId = projectRows[0].relatedTopicId;

        // Resolve the policy for this topic to get schema names from rawSchemaJson.
        const policyForActivity: Array<{ rawSchemaJson: Record<string, unknown> | null }> =
            await this.dataSource.query(
                `SELECT p."rawSchemaJson"
                 FROM policy p
                 WHERE p."policyTopicId" IN (
                     SELECT DISTINCT "policyTopicId"
                     FROM message
                     WHERE type = 'Instance-Policy'
                       AND action = 'publish-policy'
                       AND options->>'instanceTopicId' = $1
                     UNION
                     SELECT $1::varchar
                 )
                   AND p."decodeStatus" = 'decoded'
                 LIMIT 1`,
                [topicId],
            );

        const schemaNameMap = new Map<string, string>();
        if (policyForActivity.length > 0) {
            const rsj = (policyForActivity[0].rawSchemaJson ?? {}) as Record<string, unknown>;
            for (const [iri, schemaDoc] of Object.entries(rsj)) {
                const doc = (schemaDoc ?? {}) as Record<string, unknown>;
                const name = typeof doc['name'] === 'string' ? doc['name'] : null;
                if (name) schemaNameMap.set(iri, name);
            }
        }

        // Scope the timeline: when multiple PROJECT rows share this instance topic, a full-topic scan
        // over-lists sibling projects' VCs, so source it from this project's own linkedVcs instead.
        const projectCountRows: Array<{ cnt: number }> = await this.dataSource.query(
            `SELECT COUNT(*)::int AS cnt
             FROM business_view
             WHERE "viewType" = 'PROJECT' AND "relatedTopicId" = $1`,
            [topicId],
        );
        const projectCount = projectCountRows[0]?.cnt ?? 1;

        let rows: Array<{ consensusTimestamp: string; type: string; vc_schema_iri: string | null }>;
        if (projectCount > 1) {
            const linkedVcs = Array.isArray(projectRows[0].businessData?.['linkedVcs'])
                ? (projectRows[0].businessData!['linkedVcs'] as Array<{ consensusTimestamp?: unknown }>)
                : [];
            const timestamps = linkedVcs
                .map(v => v?.consensusTimestamp)
                .filter((ts): ts is string => typeof ts === 'string' && ts.length > 0);
            if (timestamps.length === 0) return [];
            rows = await this.dataSource.query(
                `SELECT
                    m."consensusTimestamp",
                    m.type,
                    split_part(
                        m.documents -> 'credentialSubject' -> 0 ->> 'type',
                        '&', 1
                    ) AS vc_schema_iri
                 FROM message m
                 WHERE m."consensusTimestamp" = ANY($1::varchar[])
                   AND m.type IN ('VC-Document', 'VP-Document')
                   AND m.documents IS NOT NULL
                 ORDER BY m."consensusTimestamp" ASC`,
                [timestamps],
            );
        } else {
            rows = await this.dataSource.query(
                `SELECT
                    m."consensusTimestamp",
                    m.type,
                    split_part(
                        m.documents -> 'credentialSubject' -> 0 ->> 'type',
                        '&', 1
                    ) AS vc_schema_iri
                 FROM message m
                 WHERE m."topicId" = $1
                   AND m.type IN ('VC-Document', 'VP-Document')
                   AND m.documents IS NOT NULL
                 ORDER BY m."consensusTimestamp" ASC
                 LIMIT 100`,
                [topicId],
            );
        }

        return rows.map(r => ({
            consensusTimestamp: r.consensusTimestamp,
            messageType: r.type,
            schemaName: (r.vc_schema_iri ? schemaNameMap.get(r.vc_schema_iri) : undefined) ?? null,
        }));
    }

    /**
     * NFT serials attributed to one mint event of this project.
     *
     * The mint must belong to the requested project (project_key match) — this
     * check prevents reading another project's serials through this project's
     * namespace, mirroring getLinkedVcDocument's linkedVcs guard.
     *
     * Serials are resolved through Guardian's NFT-metadata convention: the mint
     * VP-Document's consensus timestamp is base64-encoded into every NFT minted
     * for that VP (decoded into nft_cache."metadataTimestamp" by the worker, and
     * linked to the mint by serial-mint-linker). mintMatchStatus tells the
     * caller how far to trust the attribution — only 'verified' means the serial
     * count exactly matches the MintToken VC's amount.
     *
     * Fungible mints resolve a VP but never serials, so they return an empty
     * list: fungible units are interchangeable and cannot be enumerated.
     */
    async findMintSerials(
        projectId: string | null,
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<MintSerialsResult | null> {
        const link = await this.resolveMintLink(projectId, mintConsensusTimestamp);
        if (!link) return null;

        const empty = {
            mintConsensusTimestamp,
            vpConsensusTimestamp: link.vp_ts ?? null,
            tokenId: link.token_id ?? null,
            mintMatchStatus: link.mint_match_status ?? null,
            totalSerials: 0,
            activeCount: 0,
            retiredCount: 0,
            totalRanges: 0,
            ranges: [] as SerialRangeRow[],
        };
        if (!link.token_id || !link.vp_ts) {
            return empty;
        }

        // Gaps-and-islands: consecutive serials sharing a retired state have a
        // constant (serial − row_number), so grouping on that constant collapses
        // each run into one row. Partitioned by `deleted` so a retirement splits
        // the range rather than being lost inside it.
        //
        // Grouped in Postgres rather than in the client: an issuance of 42,278
        // serials is a single range, so this is the difference between a ~1.6 MB
        // response and a few hundred bytes.
        // Partitioned by holder as well as retired state, so a range only ever
        // describes serials that are in the same hands — a change of owner
        // splits the run rather than being averaged away inside it.
        const rangesSql = `
            WITH islands AS (
                SELECT "serialNumber" AS serial, deleted, "accountId",
                       "serialNumber" - ROW_NUMBER() OVER (
                           PARTITION BY deleted, "accountId" ORDER BY "serialNumber"
                       ) AS grp
                FROM nft_cache
                WHERE "tokenId" = $1 AND "metadataTimestamp" = $2
            ),
            ranges AS (
                SELECT MIN(serial)::int AS "from", MAX(serial)::int AS "to",
                       COUNT(*)::int AS count, deleted, "accountId"
                FROM islands
                GROUP BY deleted, "accountId", grp
            )
        `;

        const [[totals], rangeRows]: [
            Array<{ total_serials: string; active_count: string; retired_count: string; total_ranges: string }>,
            SerialRangeRow[],
        ] = await Promise.all([
            this.dataSource.query(
                `${rangesSql}
                 SELECT COALESCE(SUM(count), 0)::text                                  AS total_serials,
                        COALESCE(SUM(count) FILTER (WHERE NOT deleted), 0)::text       AS active_count,
                        COALESCE(SUM(count) FILTER (WHERE deleted), 0)::text           AS retired_count,
                        COUNT(*)::text                                                 AS total_ranges
                 FROM ranges`,
                [link.token_id, link.vp_ts],
            ),
            this.dataSource.query(
                `${rangesSql}
                 SELECT "from", "to", count, deleted, "accountId"
                 FROM ranges
                 ORDER BY "from" ASC
                 LIMIT $3 OFFSET $4`,
                [link.token_id, link.vp_ts, limit, (page - 1) * limit],
            ),
        ]);

        return {
            ...empty,
            totalSerials: parseInt(totals?.total_serials ?? '0', 10),
            activeCount: parseInt(totals?.active_count ?? '0', 10),
            retiredCount: parseInt(totals?.retired_count ?? '0', 10),
            totalRanges: parseInt(totals?.total_ranges ?? '0', 10),
            ranges: rangeRows.map(r => ({
                from: Number(r.from),
                to: Number(r.to),
                count: Number(r.count),
                deleted: r.deleted,
                accountId: r.accountId ?? null,
            })),
        };
    }

    /**
     * Resolves a mint event, optionally requiring it to belong to a project.
     *
     * `projectId` null is used by the issuance-scoped routes, which address a
     * mint directly and have no project namespace to guard. Passing a project id
     * keeps the guard the project-scoped routes rely on: it stops one project's
     * serials being read through another project's URL.
     */
    private async resolveMintLink(
        projectId: string | null,
        mintConsensusTimestamp: string,
    ): Promise<{ token_id: string | null; vp_ts: string | null; mint_match_status: string | null } | null> {
        const rows = await this.dataSource.query(
            `SELECT pml.token_id, pml.vp_consensus_timestamp AS vp_ts, pml.mint_match_status
             FROM project_mint_link pml
             WHERE pml.mint_consensus_timestamp = $1
               AND (
                   $2::varchar IS NULL
                   OR EXISTS (
                       SELECT 1 FROM business_view bv
                       WHERE bv."projectKey" = pml.project_key AND bv."viewType" = 'PROJECT'
                         AND (bv."sourceTimestamp" = $2 OR bv."projectKey" = $2)
                   )
               )
             LIMIT 1`,
            [mintConsensusTimestamp, projectId],
        );
        if (rows[0]) {
            return rows[0];
        }

        // No link row. When the caller named a project, that is a genuine
        // rejection — the guard did its job. Unscoped, the mint may simply never
        // have been attributed to a project, which is common; fall back to the
        // credential so the issuance page can show an empty serial list instead
        // of a 404.
        if (projectId !== null) {
            return null;
        }
        const [credential] = await this.dataSource.query(
            `SELECT m.documents->'credentialSubject'->0->>'tokenId' AS token_id
             FROM message m
             WHERE m."consensusTimestamp" = $1
               AND m.type = 'VC-Document'
               AND m.documents->'credentialSubject'->0->>'type' LIKE 'MintToken%'
             LIMIT 1`,
            [mintConsensusTimestamp],
        );
        return credential
            ? { token_id: credential.token_id ?? null, vp_ts: null, mint_match_status: null }
            : null;
    }

    /**
     * Retirement and transfer transactions affecting one mint event's serials.
     *
     * Both sides are grouped back into the transaction that caused them, because
     * a single retirement or distribution moves many serials at once — listing
     * one row per serial would turn a 10-serial retirement into ten "events"
     * that never happened separately.
     *
     * Serials are matched through nft_cache."metadataTimestamp", so only credits
     * this mint actually produced are counted, even when a token spans several
     * mint events. Same ownership guard as findMintSerials.
     */
    /** Sortable columns, whitelisted — the value is interpolated into ORDER BY. */
    private static readonly TX_SORT: Record<string, string> = {
        date: 'consensus_timestamp',
        // The displayed event, not the raw row type — otherwise a wipe-driven
        // retirement would sort among the transfers while showing "Retirement".
        event: 'event',
        credits: 'cardinality(serials)',
        serials: 'serials[1]',
    };

    async findMintTransactions(
        projectId: string | null,
        mintConsensusTimestamp: string | null,
        page: number,
        limit: number,
        sortBy = 'date',
        sortDir: 'asc' | 'desc' = 'desc',
    ): Promise<MintTransactionsResult | null> {
        // Scope: one mint event, or every mint of the project when no timestamp
        // is given (the project-level Credit Lifecycle view). Each row is a
        // (token, mint VP) pair — the key that identifies which serials belong
        // to which issuance.
        //
        // A null projectId addresses the mint directly (issuance-scoped routes);
        // a value keeps the ownership guard the project-scoped routes rely on.
        // Both null would scope to every mint on the network — refuse rather
        // than let a caller accidentally ask for that.
        if (projectId === null && mintConsensusTimestamp === null) {
            return null;
        }

        const scope: Array<{ token_id: string | null; vp_ts: string | null }> =
            await this.dataSource.query(
                `SELECT DISTINCT pml.token_id, pml.vp_consensus_timestamp AS vp_ts
                 FROM project_mint_link pml
                 WHERE ($2::varchar IS NULL OR pml.mint_consensus_timestamp = $2)
                   AND (
                       $1::varchar IS NULL
                       OR EXISTS (
                           SELECT 1 FROM business_view bv
                           WHERE bv."projectKey" = pml.project_key AND bv."viewType" = 'PROJECT'
                             AND (bv."sourceTimestamp" = $1 OR bv."projectKey" = $1)
                       )
                   )`,
                [projectId, mintConsensusTimestamp],
            );

        if (scope.length === 0) {
            // Unscoped and unlinked: the mint may exist as a credential that was
            // never attributed to a project. Report no transactions rather than
            // 404-ing an issuance the user can legitimately open.
            if (projectId === null && mintConsensusTimestamp !== null) {
                const [credential] = await this.dataSource.query(
                    `SELECT 1 FROM message m
                     WHERE m."consensusTimestamp" = $1
                       AND m.type = 'VC-Document'
                       AND m.documents->'credentialSubject'->0->>'type' LIKE 'MintToken%'
                     LIMIT 1`,
                    [mintConsensusTimestamp],
                );
                if (credential) {
                    // No token linked yet, so no treasury to have swept.
                    return { total: 0, transactions: [], transferHistorySynced: false };
                }
            }
            return null;
        }

        const pairs = scope.filter((s): s is { token_id: string; vp_ts: string } => !!s.token_id && !!s.vp_ts);
        if (pairs.length === 0) {
            return { total: 0, transactions: [], transferHistorySynced: false };
        }

        const tokenIds = pairs.map(p => p.token_id);
        const vpTimestamps = pairs.map(p => p.vp_ts);

        // Transfers are read from each token's treasury account, swept in the
        // background. Until every treasury behind these credits carries a
        // watermark, an empty table means "not read yet", not "nothing moved".
        const [sweep]: Array<{ synced: boolean }> = await this.dataSource.query(
            `SELECT COALESCE(BOOL_AND("transferTxWatermark" IS NOT NULL), false) AS synced
             FROM token_cache
             WHERE "tokenId" = ANY($1::varchar[])`,
            [tokenIds],
        );
        const transferHistorySynced = sweep?.synced ?? false;

        // Retirements name their serials in an array; transfers are one row per
        // serial and are regrouped by the transaction that moved them, so a
        // distribution of 10 serials reads as one event rather than ten.
        const eventsSql = `
            WITH scope AS (
                SELECT * FROM unnest($1::varchar[], $2::varchar[]) AS s(token_id, vp_ts)
            ),
            scoped_serials AS (
                SELECT n."tokenId" AS token_id, n."serialNumber" AS serial_number, n.deleted
                FROM nft_cache n
                JOIN scope sc ON sc.token_id = n."tokenId" AND sc.vp_ts = n."metadataTimestamp"
            ),
            retirements AS (
                SELECT 'retirement'::text AS type,
                       tre.consensus_timestamp,
                       tre.account_id,
                       NULL::varchar AS sender_account_id,
                       NULL::varchar AS receiver_account_id,
                       ARRAY(
                           SELECT s FROM unnest(tre.serials) AS s
                           WHERE EXISTS (
                               SELECT 1 FROM scoped_serials ss
                               WHERE ss.token_id = tre.token_id AND ss.serial_number = s
                           )
                           ORDER BY s
                       ) AS serials,
                       -- Column order must match the transfers branch below:
                       -- UNION ALL pairs columns by position, not by name.
                       true AS is_latest,
                       0 AS retired_since
                FROM token_retire_event tre
                WHERE tre.token_id = ANY($1::varchar[])
            ),
            -- The most recent move of each serial. Only that row can be said to
            -- describe where a credit ended up; an earlier hop sent it to the
            -- next holder, not to wherever it eventually came to rest.
            last_move AS (
                SELECT token_id, serial_number, MAX(consensus_timestamp) AS last_ts
                FROM token_transfer_event
                WHERE token_id = ANY($1::varchar[])
                GROUP BY token_id, serial_number
            ),
            transfers AS (
                SELECT 'transfer'::text AS type,
                       tte.consensus_timestamp,
                       NULL::varchar AS account_id,
                       tte.sender_account_id,
                       tte.receiver_account_id,
                       ARRAY_AGG(tte.serial_number ORDER BY tte.serial_number) AS serials,
                       -- True only when every serial in this row was last moved
                       -- here. Most serials move once, but some move four or five
                       -- times, and without this each hop would read as the
                       -- credit's final resting place.
                       BOOL_AND(tte.consensus_timestamp = lm.last_ts) AS is_latest,
                       -- How many of the moved serials are retired today. Without
                       -- this, a transfer of credits that were later wiped outside
                       -- Guardian's retirement contract reads as if nothing ever
                       -- happened to them: the retirement leaves no transaction of
                       -- its own, so this is the only place it can surface.
                       (COUNT(*) FILTER (WHERE ss.deleted))::int AS retired_since
                FROM token_transfer_event tte
                JOIN scoped_serials ss
                  ON ss.token_id = tte.token_id AND ss.serial_number = tte.serial_number
                JOIN last_move lm
                  ON lm.token_id = tte.token_id AND lm.serial_number = tte.serial_number
                GROUP BY tte.consensus_timestamp, tte.sender_account_id, tte.receiver_account_id
            ),
            -- Credits either changed hands or left circulation. A transfer whose
            -- credits were all destroyed, and which was their last movement, is a
            -- retirement in substance: the credits can never be sold or claimed
            -- again, whether or not the registry's retirement contract recorded
            -- it. Classifying here rather than per consumer keeps that judgement
            -- in one place and lets ORDER BY sort on the value readers are shown.
            classified AS (
                SELECT r.*, true AS is_retirement
                FROM retirements r WHERE cardinality(r.serials) > 0
                UNION ALL
                SELECT t.*,
                       (t.is_latest
                        AND cardinality(t.serials) > 0
                        AND t.retired_since >= cardinality(t.serials)) AS is_retirement
                FROM transfers t
            ),
            combined AS (
                SELECT c.*,
                       CASE WHEN c.is_retirement THEN 'retirement' ELSE 'transfer' END AS event,
                       -- How well documented the offset claim is: recorded by the
                       -- registry's retirement contract, or evidenced only by the
                       -- credits' destruction on the ledger.
                       CASE WHEN c.is_retirement
                            THEN CASE WHEN c.type = 'retirement' THEN 'guardian' ELSE 'ledger' END
                       END AS retirement_source,
                       -- Account holding the credits at the moment they left
                       -- circulation. Where the retirement is only evidenced by
                       -- destruction, that is the last transfer's recipient — the
                       -- party that held them — not whoever sent them.
                       CASE WHEN c.is_retirement
                            THEN COALESCE(c.account_id, c.receiver_account_id)
                       END AS holder_account_id
                FROM classified c
            )
        `;

        // Count and page each rebuild the scoped_serials CTE, which for a large
        // issuance means materialising tens of thousands of rows twice. Running
        // them together halves the wall time rather than paying for it serially.
        const [[countRow], rows]: [
            Array<{ total: string }>,
            Array<{
                type: 'retirement' | 'transfer';
                consensus_timestamp: string;
                account_id: string | null;
                sender_account_id: string | null;
                receiver_account_id: string | null;
                serials: number[];
                is_latest: boolean;
                retired_since: number;
                event: 'retirement' | 'transfer';
                retirement_source: 'guardian' | 'ledger' | null;
                holder_account_id: string | null;
            }>,
        ] = await Promise.all([
            this.dataSource.query(
                `${eventsSql} SELECT COUNT(*)::text AS total FROM combined`,
                [tokenIds, vpTimestamps],
            ),
            this.dataSource.query(
                // Whitelisted column, and direction reduced to one of two literals
                // — neither reaches the query as caller-supplied text. Consensus
                // timestamp is the tiebreak so paging stays stable when the
                // primary key ties (a distribution emits many rows per second).
                `${eventsSql}
                 SELECT * FROM combined
                 ORDER BY ${PgProjectRepository.TX_SORT[sortBy] ?? 'consensus_timestamp'} ${
                    sortDir === 'asc' ? 'ASC' : 'DESC'
                 }, consensus_timestamp DESC
                 LIMIT $3 OFFSET $4`,
                [tokenIds, vpTimestamps, limit, (page - 1) * limit],
            ),
        ]);

        return {
            total: parseInt(countRow?.total ?? '0', 10),
            transferHistorySynced,
            transactions: rows.map(r => ({
                event: r.event,
                consensusTimestamp: r.consensus_timestamp,
                retirementSource: r.retirement_source ?? null,
                // A retirement has no counterparty — the credits left circulation
                // rather than moving to another account — so it reports only the
                // holder. A transfer reports the sender/receiver pair instead.
                holderAccountId: r.holder_account_id ?? null,
                senderAccountId: r.event === 'retirement' ? null : (r.sender_account_id ?? null),
                receiverAccountId: r.event === 'retirement' ? null : (r.receiver_account_id ?? null),
                serials: (r.serials ?? []).map(Number),
                // Only a transfer can be partly retired — some of the lot claimed
                // as an offset, the rest still tradable. A retirement covers every
                // serial it names, so the count adds nothing there.
                retiredSince: r.event === 'retirement' ? 0 : Number(r.retired_since ?? 0),
            })),
        };
    }

    /** Full filtered projects dataset for the export engine; batches internally via a LIMIT/OFFSET loop ordered by `sourceTimestamp`. */
    async findAllForExport(filters: ProjectExportFilters): Promise<ProjectExportRow[]> {
        const builder = new QueryBuilder(PROJECT_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'PROJECT'`);

        builder.addFilters({
            name: filters.name,
            country: this.applyCountryFilter(builder, filters.country),
            methodology: filters.methodology,
            registry: filters.registry,
            developer: filters.developer,
            vintage: filters.vintage,
            status: filters.status,
            policyTopicId: filters.policyTopicId,
            instanceTopicId: filters.instanceTopicId,
            sector: filters.sector,
            sectoralScope: filters.sectoralScope,
            vintageYear: filters.vintageRange,
            sdgs: filters.sdgs,
            lifecycleStage: filters.lifecycleStage,
            expectedIssuanceYear: filters.expectedIssuanceYearRange,
        });

        if (filters.isPipeline === 'true') {
            builder.addClause(`lc.lifecycle_stage != 'Issued'`);
        } else if (filters.isPipeline === 'false') {
            builder.addClause(`lc.lifecycle_stage = 'Issued'`);
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

        const rows: ProjectExportRow[] = [];
        for (let offset = 0; ; offset += EXPORT_BATCH_SIZE) {
            const params = [...baseParams, EXPORT_BATCH_SIZE, offset];

            const batchSql = `
                SELECT
                    bv."businessData"->>'name'      AS project_name,
                    reg.registry_name,
                    bv."businessData"->>'developer' AS developer,
                    bv."businessData"->>'country'   AS country,
                    COALESCE(ps.total_issued, 0)     AS total_issued,
                    bv."businessData"->>'vintage'    AS vintage,
                    bv."businessData"->>'creditingPeriodStart' AS "creditingPeriodStart",
                    COALESCE(meth.methodology_name, bv."businessData"->>'methodology') AS standard,
                    meth.emission_reduction_approach AS mitigation_type_raw,
                    bv."businessData"->'sdgs' AS sdgs,
                    bv."relatedTopicId",
                    src_msg."dataSource",
                    src_msg.files                    AS "ipfsCids"
                FROM business_view bv
                ${REGISTRY_NAME_JOIN}
                ${PROJECT_STATS_JOIN}
                ${PROJECT_LIFECYCLE_JOIN}
                ${METHODOLOGY_JOIN}
                ${SOURCE_MESSAGE_JOIN}
                WHERE ${whereSql}
                ORDER BY bv."sourceTimestamp" ASC
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

            const batch: RawExportRow[] = await this.dataSource.query(batchSql, params);
            rows.push(...batch.map(PgProjectRepository.mapExportRow));

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

    /** Distinct filter-dropdown option values across the whole (unfiltered) PROJECT set — mirrors PgDashboardRepository.getFilterOptions(). */
    async getFilterOptions(): Promise<ProjectFilterOptionsRow> {
        const sql = `
            SELECT
                -- ARRAY_AGG ... FILTER returns SQL NULL, not {}, when every row is
                -- filtered out (e.g. a network where no project has that field set)
                -- — COALESCE normalizes to the empty array every caller already
                -- expects instead of null, which crashes a plain .map() downstream.
                COALESCE(ARRAY_AGG(DISTINCT registry_name)   FILTER (WHERE registry_name <> ''),   ARRAY[]::text[]) AS registries,
                COALESCE(ARRAY_AGG(DISTINCT developer)        FILTER (WHERE developer <> ''),       ARRAY[]::text[]) AS developers,
                COALESCE(ARRAY_AGG(DISTINCT status)           FILTER (WHERE status <> ''),          ARRAY[]::text[]) AS statuses,
                COALESCE(ARRAY_AGG(DISTINCT sector)           FILTER (WHERE sector <> ''),          ARRAY[]::text[]) AS sectors,
                COALESCE(ARRAY_AGG(DISTINCT "sectoralScope")  FILTER (WHERE "sectoralScope" <> ''), ARRAY[]::text[]) AS "sectoralScopes",
                COALESCE(ARRAY_AGG(DISTINCT vintage)          FILTER (WHERE vintage <> ''),         ARRAY[]::text[]) AS vintages,
                COALESCE(ARRAY_AGG(DISTINCT country)          FILTER (WHERE country <> ''),         ARRAY[]::text[]) AS countries
            FROM (
                SELECT
                    COALESCE(reg.registry_name, '')                    AS registry_name,
                    COALESCE(bv."businessData"->>'developer', '')      AS developer,
                    COALESCE(bv."businessData"->>'status', '')         AS status,
                    COALESCE(bv."businessData"->>'sector', '')         AS sector,
                    COALESCE(bv."businessData"->>'sectoralScope', '')  AS "sectoralScope",
                    COALESCE(bv."businessData"->>'vintage', '')        AS vintage,
                    -- Prefer the reverse-geocoded code over the raw stored value
                    -- (same rationale as applyCountryFilter/unique_countries above)
                    -- so a recovered country like "MDG" appears as its own
                    -- selectable option instead of the unrecognized raw text that
                    -- would otherwise just collapse into "Other" client-side.
                    COALESCE(NULLIF(bv."businessData"->>'geoCountryCode', ''), bv."businessData"->>'country', '') AS country
                FROM business_view bv
                ${REGISTRY_NAME_JOIN}
                WHERE bv."viewType" = 'PROJECT'
            ) opts
        `;

        // METHODOLOGY rows can have multiple historical entries per relatedTopicId
        // (re-decode events) — DISTINCT ON with this ordering picks the latest one
        // per methodology, mirroring PgMethodologyRepository.findById's identical
        // "latest row wins" convention.
        const methodologiesSql = `
            SELECT DISTINCT ON (bv."relatedTopicId")
                bv."relatedTopicId" AS "topicId",
                bv."displayName"    AS "name",
                bv."businessData"->'options'->>'version' AS "version"
            FROM business_view bv
            WHERE bv."viewType" = 'METHODOLOGY'
              AND bv."relatedTopicId" IS NOT NULL
            ORDER BY bv."relatedTopicId", bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
        `;

        const [rows, methodologyRows]: [ProjectFilterOptionsRow[], MethodologyFilterOptionRow[]] = await Promise.all([
            this.dataSource.query(sql),
            this.dataSource.query(methodologiesSql),
        ]);

        const base = rows[0] ?? {
            registries: [], developers: [], statuses: [], sectors: [], sectoralScopes: [], vintages: [], countries: [],
        };
        return { ...base, methodologies: methodologyRows ?? [] };
    }

    private static mapExportRow(row: RawExportRow): ProjectExportRow {
        const cids = Array.isArray(row.ipfsCids)
            ? row.ipfsCids.filter((c): c is string => typeof c === 'string' && c.length > 0)
            : [];

        return {
            project_name: row.project_name ?? null,
            registry: row.registry_name ?? null,
            developer: row.developer ?? null,
            country: row.country ?? null,
            emissions_reduced: row.total_issued != null ? parseFloat(row.total_issued) : null,
            reporting_year: PgProjectRepository.deriveReportingYear(row.vintage, row.creditingPeriodStart),
            mitigation_type: PgProjectRepository.extractEmissionReductionApproach(row.mitigation_type_raw),
            standard: row.standard ?? null,
            vintage: row.vintage ?? null,
            sdg: Array.isArray(row.sdgs) ? row.sdgs.join(', ') : '',
            ipfs_document_ref: cids.length > 0 ? cids.join('; ') : null,
            // A project has no single mint transaction or Hedera token, so leave blank rather than fabricate;
            // `_topicId` still resolves a verification_url via the topic fallback.
            _consensusTimestamp: null,
            _tokenId: null,
            _topicId: row.relatedTopicId ?? null,
            _dataSource: row.dataSource ?? null,
        };
    }

    /** reporting_year = vintage (as a 4-digit year), else year(creditingPeriodStart). Mirrors project.dto.ts's identical vintage/creditingPeriodStart year extraction. */
    private static deriveReportingYear(vintage: string | null, creditingPeriodStart: string | null): number | null {
        const vintageYear = vintage?.match(/\d{4}/)?.[0];
        if (vintageYear) return parseInt(vintageYear, 10);
        const cpsYear = creditingPeriodStart?.match(/\d{4}/)?.[0];
        if (cpsYear) return parseInt(cpsYear, 10);
        return null;
    }

    /** `emissionReductionApproach` arrives as a JSONB array of policyMapping entries; the resolved label lives in `entry.schemaName`. Mirrors `PgMethodologyRepository`/`PgCreditRepository`'s identical extraction logic, duplicated per this codebase's self-contained-repository convention. */
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

    // Builds the PolicySchemaRow list the DTO uses to classify linked VCs, from a policy's {schemaIri -> name} map and its policyMapping.
    // `mrvSchemaUuids` (bare UUIDs bound to an externalDataBlock) is only ever populated on the findById() path —
    // findAll() intentionally skips fetching rawPolicyJson for list rows (perf), so every list-row schema is isMrvSchema=false.
    private static buildPolicySchemas(
        schemaNamesByIri: Map<string, string | null>,
        policyMapping: Record<string, unknown[]>,
        mrvSchemaUuids: Set<string> = new Set(),
    ): PolicySchemaRow[] {
        const projectIris = new Set<string>();
        const docTypeByIri = new Map<string, string>();
        for (const entries of Object.values(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (!entry || typeof entry !== 'object') continue;
                const e = entry as Record<string, unknown>;
                if (e['isProjectSchema'] === true && typeof e['schemaIri'] === 'string') {
                    projectIris.add(e['schemaIri'] as string);
                }
                if (typeof e['schemaIri'] === 'string' && typeof e['docType'] === 'string') {
                    docTypeByIri.set(e['schemaIri'] as string, e['docType'] as string);
                }
            }
        }

        return [...schemaNamesByIri.entries()].map(([iri, name]) => ({
            schemaId: iri,
            name,
            isProjectSchema: projectIris.has(iri),
            docType: docTypeByIri.get(iri) ?? 'unknown',
            isMrvSchema: mrvSchemaUuids.has(iri.replace(/^#/, '').split('&')[0].trim()),
        })).sort((a, b) => {
            if (a.isProjectSchema && !b.isProjectSchema) return -1;
            if (!a.isProjectSchema && b.isProjectSchema) return 1;
            return (a.name ?? '').localeCompare(b.name ?? '');
        });
    }

    private static mapRow(
        row: RawRow,
        issuances?: IssuanceRow[],
        lifecycle?: { totalIssued: number; totalDeclared: number; totalRetired: number; totalActive: number; totalTransferred?: number | null },
        policySchemas?: PolicySchemaRow[],
        issuanceEvents?: IssuanceEventRow[],
        issuanceCount?: number,
        polygon?: string | null,
    ): ProjectRow {
        // When called from findAll(), lifecycle totals come from the lateral subquery columns on the raw row;
        // when called from findById(), they are passed explicitly as the lifecycle argument (which takes priority).
        // parseFloat, not parseInt: total_issued/total_declared are NUMERIC so a
        // fungible mint of 250.5 credits must not be truncated to 250.
        const resolvedLifecycle = lifecycle ?? (row.total_issued != null
            ? (() => {
                const issued = parseFloat(row.total_issued!);
                const retired = parseInt(row.total_retired ?? '0', 10);
                return {
                    totalIssued: issued,
                    totalDeclared: row.total_declared != null ? parseFloat(row.total_declared) : issued,
                    totalRetired: retired,
                    totalActive: issued - retired,
                    // The list query has no per-serial ownership data, so leave
                    // transfers undefined here rather than reporting a zero the
                    // detail page would then contradict.
                    totalTransferred: undefined as number | undefined,
                };
            })()
            : undefined);

        return {
            id: row.id,
            sourceTimestamp: row.sourceTimestamp,
            projectKey: row.projectKey ?? null,
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
            issuanceEvents: issuanceEvents ?? [],
            // findAll() supplies this via the mv_project_stats join on the raw row; findById() computes it
            // live and passes it explicitly (which takes priority, mirroring how `lifecycle` is resolved above).
            issuanceCount: issuanceCount ?? row.issuance_count ?? undefined,
            totalIssued: resolvedLifecycle?.totalIssued,
            totalDeclared: resolvedLifecycle?.totalDeclared,
            totalRetired: resolvedLifecycle?.totalRetired,
            totalTransferred: resolvedLifecycle?.totalTransferred,
            totalActive: resolvedLifecycle?.totalActive,
            policySchemas,
            polygon: polygon ?? null,
            lifecycleStage: row.lifecycleStage ?? null,
            expectedIssuanceYear: row.expectedIssuanceYear ?? null,
        };
    }
}
