import { DataSource } from 'typeorm';
import { MV_PROJECT_STATS_NAME } from '@shared/materialized-views';
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
} from './project.repository';
import { QueryBuilder } from './query-builder';
import { PROJECT_FIELD_SCHEMA } from './schemas/project.schema';

/** Batch size for the internally-batched `findAllForExport` LIMIT/OFFSET loop. */
const EXPORT_BATCH_SIZE = 2000;

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
    // pg returns bigint columns as strings
    total_issued: string | null;
    total_retired: string | null;
}

const SEARCH_TSVECTOR = `(
    setweight(to_tsvector('english', coalesce(bv."displayName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bv."registryDid", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bv."searchText", '')), 'C')
)`;

/** LATERAL subquery joined into both findAll and findById to look up the publishing registry's display name, using ORDER BY + LIMIT 1 to handle the rare case of multiple REGISTRY rows for one DID. */
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

/** Per-project lifecycle aggregates (issuance count, total issued, total retired) are read from the mv_project_stats materialized view instead of being computed live per row; the MV is keyed by projectKey and refreshed by MvRefreshProcessor. */
const PROJECT_STATS_JOIN = `
    LEFT JOIN ${MV_PROJECT_STATS_NAME} ps
        ON ps."projectKey" = bv."projectKey"
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

    async findAll(query: ProjectListQuery): Promise<ProjectListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(PROJECT_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'PROJECT'`);

        // Generic filters: every filterable field defined in the schema is wired automatically.
        builder.addFilters({
            name: query.name,
            country: query.country,
            methodology: query.methodology,
            registry: query.registry,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
            policyTopicId: query.policyTopicId,
            instanceTopicId: query.instanceTopicId,
        });

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
                bv.*,
                reg.registry_name,
                COALESCE(ps.issuance_count, 0) AS issuance_count,
                COALESCE(ps.total_issued, 0)   AS total_issued,
                COALESCE(ps.total_retired, 0)  AS total_retired,
                ${rankExpr} AS search_rank
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            ${PROJECT_STATS_JOIN}
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE but skips LIMIT/OFFSET; the registry-name LATERAL is only included
        // when the `registry` filter references it, avoiding that subquery's cost on large unfiltered PROJECT sets.
        const countParams = params.slice(0, params.length - 2);
        const countJoin = query.registry ? REGISTRY_NAME_JOIN : '';
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
            total: countResult[0]?.total ?? 0,
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

        // Step 1 — per-project mint attribution via project_mint_link: the linker pre-resolves each MintToken to
        // its specific project by walking options.relationships, so this is correct even for grouped projects
        // that share one instance topic.
        let issuances: IssuanceRow[] = [];
        let issuanceEvents: IssuanceEventRow[] = [];
        let totalIssued = 0;
        let totalRetired = 0;

        const mintTokenRows: Array<{
            token_id: string | null;
            amount: number | null;
            mint_date: Date | null;
            documents: Record<string, any> | null;
            mint_ts: string;
            link_method: string | null;
        }> = await this.dataSource.query(
            `SELECT
                pml.token_id,
                pml.amount,
                pml.mint_date,
                m.documents,
                pml.mint_consensus_timestamp AS mint_ts,
                pml.link_method
             FROM project_mint_link pml
             JOIN message m ON m."consensusTimestamp" = pml.mint_consensus_timestamp
             WHERE pml.project_key = $1
             ORDER BY pml.mint_date ASC NULLS LAST`,
            [row.projectKey],
        );

        if (mintTokenRows.length > 0) {
            // Aggregate minted amount per token; keep last MintToken VC as raw data
            const mintsByToken = new Map<string, { total: number; mintDate: Date | null; rawVc: Record<string, any> | null }>();
            for (const r of mintTokenRows) {
                if (!r.token_id) continue;
                const existing = mintsByToken.get(r.token_id) ?? { total: 0, mintDate: r.mint_date, rawVc: r.documents };
                existing.total += r.amount != null ? Number(r.amount) : 0;
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
                };
            });

            // totalIssued = sum of MintToken amounts (project-specific)
            totalIssued = [...mintsByToken.values()].reduce((s, v) => s + v.total, 0);

            // totalRetired = NFT serials marked deleted for tokens this project minted
            const nftTokenIds = issuances
                .filter(i => i.type === 'NON_FUNGIBLE_UNIQUE')
                .map(i => i.tokenId)
                .filter((tid): tid is string => !!tid);

            if (nftTokenIds.length > 0) {
                const nftStats: Array<{ tokenId: string; total_retired: string }> =
                    await this.dataSource.query(
                        `SELECT "tokenId",
                                COUNT(*) FILTER (WHERE deleted = true)::text AS total_retired
                         FROM nft_cache
                         WHERE "tokenId" = ANY($1::varchar[])
                         GROUP BY "tokenId"`,
                        [nftTokenIds],
                    );
                for (const s of nftStats) {
                    totalRetired += parseInt(s.total_retired, 10);
                }
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
                    tc."totalSupply"                                      AS supply,
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
                for (const i of issuances) {
                    if (i.type !== 'NON_FUNGIBLE_UNIQUE') totalIssued += i.supply;
                }
            } // end else (siblingCount === 1)
        }

        const totalActive = totalIssued - totalRetired;

        // Load schema metadata for this project's policyTopicId so the DTO can render a grouped linked-VCs view without a second round trip.
        let policySchemas: PolicySchemaRow[] = [];
        if (policyTopicId) {
            const policySchemaRows: Array<{
                policyTopicId: string;
                sourceCid: string;
                rawSchemaJson: Record<string, unknown> | null;
                policyMapping: Record<string, unknown> | null;
                createdAt: Date;
                updatedAt: Date;
            }> = await this.dataSource.query(
                `SELECT "policyTopicId", "sourceCid", "rawSchemaJson", "policyMapping", "createdAt", "updatedAt"
                 FROM policy
                 WHERE "policyTopicId" = $1
                   AND "decodeStatus" = 'decoded'
                 ORDER BY "createdAt" DESC
                 LIMIT 1`,
                [policyTopicId],
            );

            if (policySchemaRows.length > 0) {
                const pr = policySchemaRows[0];
                const rawSchemaJson = (pr.rawSchemaJson ?? {}) as Record<string, unknown>;
                const schemaNamesByIri = new Map<string, string | null>();
                for (const [iri, schemaDoc] of Object.entries(rawSchemaJson)) {
                    const doc = (schemaDoc ?? {}) as Record<string, unknown>;
                    schemaNamesByIri.set(iri, typeof doc['name'] === 'string' ? doc['name'] : null);
                }
                policySchemas = PgProjectRepository.buildPolicySchemas(
                    schemaNamesByIri,
                    (pr.policyMapping ?? {}) as Record<string, unknown[]>,
                );
            }
        }

        return PgProjectRepository.mapRow(row, issuances, { totalIssued, totalRetired, totalActive }, policySchemas, issuanceEvents);
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

    /** Full filtered projects dataset for the export engine; batches internally via a LIMIT/OFFSET loop ordered by `sourceTimestamp`. */
    async findAllForExport(filters: ProjectExportFilters): Promise<ProjectExportRow[]> {
        const builder = new QueryBuilder(PROJECT_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'PROJECT'`);

        builder.addFilters({
            name: filters.name,
            country: filters.country,
            methodology: filters.methodology,
            registry: filters.registry,
            developer: filters.developer,
            vintage: filters.vintage,
            status: filters.status,
            policyTopicId: filters.policyTopicId,
            instanceTopicId: filters.instanceTopicId,
        });

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
                ${METHODOLOGY_JOIN}
                ${SOURCE_MESSAGE_JOIN}
                WHERE ${whereSql}
                ORDER BY bv."sourceTimestamp" ASC
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

            const batch: RawExportRow[] = await this.dataSource.query(batchSql, params);
            rows.push(...batch.map(PgProjectRepository.mapExportRow));

            if (batch.length < EXPORT_BATCH_SIZE) break;
        }

        return rows;
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
    private static buildPolicySchemas(
        schemaNamesByIri: Map<string, string | null>,
        policyMapping: Record<string, unknown[]>,
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
        })).sort((a, b) => {
            if (a.isProjectSchema && !b.isProjectSchema) return -1;
            if (!a.isProjectSchema && b.isProjectSchema) return 1;
            return (a.name ?? '').localeCompare(b.name ?? '');
        });
    }

    private static mapRow(
        row: RawRow,
        issuances?: IssuanceRow[],
        lifecycle?: { totalIssued: number; totalRetired: number; totalActive: number },
        policySchemas?: PolicySchemaRow[],
        issuanceEvents?: IssuanceEventRow[],
    ): ProjectRow {
        // When called from findAll(), lifecycle totals come from the lateral subquery columns on the raw row;
        // when called from findById(), they are passed explicitly as the lifecycle argument (which takes priority).
        const resolvedLifecycle = lifecycle ?? (row.total_issued != null
            ? (() => {
                const issued = parseInt(row.total_issued!, 10);
                const retired = parseInt(row.total_retired ?? '0', 10);
                return { totalIssued: issued, totalRetired: retired, totalActive: issued - retired };
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
            issuanceCount: row.issuance_count ?? undefined,
            totalIssued: resolvedLifecycle?.totalIssued,
            totalRetired: resolvedLifecycle?.totalRetired,
            totalActive: resolvedLifecycle?.totalActive,
            policySchemas,
        };
    }
}
