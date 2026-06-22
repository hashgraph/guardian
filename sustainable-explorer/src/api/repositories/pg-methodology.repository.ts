import { DataSource } from 'typeorm';
import { MV_METHODOLOGY_STATS_NAME } from '@shared/materialized-views';
import {
    MethodologyRepository,
    MethodologyListQuery,
    MethodologyListResult,
    MethodologyRow,
    MethodologyStatsRow,
    IssuanceRow,
} from './methodology.repository';
import { QueryBuilder } from './query-builder';
import { METHODOLOGY_FIELD_SCHEMA } from './schemas/methodology.schema';

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
 * Brings in the decode status for the methodology's policy topic.
 * businessData->>'topicId' is the policyTopicId stored by the worker.
 *
 * A single policyTopicId can have N policy rows (one per published version),
 * so we collapse via LATERAL — prefer the latest decoded row, fall back to
 * the latest row of any status — to keep methodologies 1:1 with their UI rows.
 */
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

/**
 * Effective decode status for display + filtering.
 * Maps policy.decodeStatus ('decoded' / 'pending' / 'failed') to the public
 * API vocabulary ('success' / 'pending' / 'failed').
 */
const EFFECTIVE_DECODE_STATUS = `
    CASE
        WHEN p."decodeStatus" = 'decoded' THEN 'success'
        ELSE p."decodeStatus"
    END
`;

/**
 * LATERAL subquery that computes totalIssued and totalRetired for each
 * methodology in the list. Mirrors the primary path used in findById:
 * - Joins projects to this methodology via businessData->>'instanceTopicId'
 * - Sums mint amounts from project_mint_link for totalIssued
 * - Counts deleted NFT serials from nft_cache for totalRetired
 */
const LIFECYCLE_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            COALESCE(SUM(pml.amount), 0)::bigint AS total_issued,
            COALESCE(SUM(
                CASE WHEN tc.type = 'NON_FUNGIBLE_UNIQUE' THEN
                    (SELECT COUNT(*) FILTER (WHERE deleted = true)::bigint
                     FROM nft_cache nc
                     WHERE nc."tokenId" = pml.token_id)
                ELSE 0::bigint END
            ), 0)::bigint AS total_retired
        FROM project_mint_link pml
        JOIN business_view proj
            ON proj."viewType" = 'PROJECT'
           AND proj."projectKey" = pml.project_key
           AND proj."businessData"->>'instanceTopicId' = bv."relatedTopicId"
        LEFT JOIN token_cache tc ON tc."tokenId" = pml.token_id
        WHERE pml.token_id IS NOT NULL
          AND bv."relatedTopicId" IS NOT NULL
    ) lc_m ON true
`;

/**
 * PostgreSQL implementation of the MethodologyRepository.
 *
 * Generic filter and sort logic is delegated to QueryBuilder + the field
 * schema (METHODOLOGY_FIELD_SCHEMA). Adding a new filterable/sortable
 * column only requires updating the schema — no SQL changes needed here.
 *
 * Special operations (full-text + fuzzy search, materialized view joins,
 * search ranking) remain explicit because they don't fit the generic
 * operator model.
 */
export class PgMethodologyRepository extends MethodologyRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: MethodologyListQuery): Promise<MethodologyListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(METHODOLOGY_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'METHODOLOGY'`);

        // Generic filters: every filterable field defined in the schema
        // is wired automatically. To add a new filter, edit methodology.schema.ts.
        builder.addFilters({
            name: query.name,
            id: query.id,
            description: query.description,
            registryDid: query.registryDid,
            registryName: query.registryName,
            version: query.version,
            policyTopicId: query.policyTopicId,
        });

        // decodeStatus filter — uses the EFFECTIVE status (CASE expression) so
        // 'success' includes policies whose schemas are imported even if a
        // recent retry flipped pds.status to 'failed'.
        // Supports pipe-separated multi-values (e.g. "success|failed").
        if (query.decodeStatus?.length) {
            const statuses = query.decodeStatus;
            const hasUnknown = statuses.includes('unknown');
            const otherStatuses = statuses.filter(s => s !== 'unknown');

            const clauses: string[] = [];
            if (hasUnknown) clauses.push(`(${EFFECTIVE_DECODE_STATUS}) IS NULL`);
            if (otherStatuses.length === 1) {
                const p = builder.nextParam(otherStatuses[0]);
                clauses.push(`(${EFFECTIVE_DECODE_STATUS}) = ${p}`);
            } else if (otherStatuses.length > 1) {
                const p = builder.nextParam(otherStatuses);
                clauses.push(`(${EFFECTIVE_DECODE_STATUS}) = ANY(${p}::text[])`);
            }

            if (clauses.length > 0) {
                builder.addClause(clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`);
            }
        }

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
                s.project_count,
                s.instance_project_count,
                s.issuance_count,
                s.instance_issuance_count,
                s.schema_count,
                reg.registry_name,
                (${EFFECTIVE_DECODE_STATUS}) AS decode_status,
                p."policyMapping"->'sectoralScopes' AS sectoral_scopes,
                p."policyMapping"->'emissionReductionApproach' AS emission_reduction_approach,
                lc_m.total_issued,
                lc_m.total_retired,
                ${rankExpr} AS search_rank
            FROM business_view bv
            LEFT JOIN ${MV_METHODOLOGY_STATS_NAME} s
                ON s."relatedTopicId" = bv."relatedTopicId"
            ${REGISTRY_NAME_JOIN}
            ${POLICY_DECODE_STATUS_JOIN}
            ${LIFECYCLE_JOIN}
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE and LATERAL join (so filters that
        // reference `reg.registry_name` resolve correctly), but skips the stats
        // MV join and the LIMIT/OFFSET params.
        const countParams = params.slice(0, params.length - 2);
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            ${REGISTRY_NAME_JOIN}
            ${POLICY_DECODE_STATUS_JOIN}
            WHERE ${whereSql}
        `;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, params),
            this.dataSource.query(countSql, countParams),
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
                reg.registry_name,
                (${EFFECTIVE_DECODE_STATUS}) AS decode_status,
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
            ORDER BY bv."createdAt" DESC NULLS LAST
            LIMIT 1
            `,
            [id],
        );

        if (rawRows.length === 0) return null;

        const row = rawRows[0];

        const instanceTopicId = row.relatedTopicId;

        // Fetch MintToken VCs for all projects under this methodology instance via
        // project_mint_link. We join through business_view PROJECT rows whose
        // businessData->>'instanceTopicId' matches this methodology's relatedTopicId
        // (the same condition mv_methodology_stats uses for instance_project_count),
        // then pull each project's attributed mints. This keeps supply figures
        // consistent with the project detail view and the credits list page.
        let issuances: IssuanceRow[] = [];
        if (instanceTopicId) {
            const mintRows: Array<{
                token_id: string | null;
                amount: number | null;
                mint_date: Date | null;
                documents: Record<string, any> | null;
            }> = await this.dataSource.query(
                `SELECT
                    pml.token_id,
                    pml.amount,
                    pml.mint_date,
                    m.documents
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
            }
        }

        // Aggregate lifecycle stats for NFT tokens: total minted (all serials) and
        // total retired (serials marked deleted by Mirror Node).
        // Fungible tokens don't have per-serial tracking so their supply is used as-is.
        const nftTokenIds = issuances
            .filter(i => i.type === 'NON_FUNGIBLE_UNIQUE')
            .map(i => i.tokenId)
            .filter((id): id is string => !!id);

        let totalIssued = 0;
        let totalRetired = 0;

        if (nftTokenIds.length > 0) {
            const nftStats: Array<{ tokenId: string; total_minted: string; total_retired: string }> =
                await this.dataSource.query(
                    `SELECT
                        "tokenId",
                        COUNT(*)::text                              AS total_minted,
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

        // Add fungible token supply to totalIssued (retirement not tracked for fungible)
        for (const i of issuances) {
            if (i.type !== 'NON_FUNGIBLE_UNIQUE') {
                totalIssued += i.supply;
            }
        }

        const totalActive = totalIssued - totalRetired;

        return PgMethodologyRepository.mapRow(row, issuances, { totalIssued, totalRetired, totalActive });
    }

    private static mapRow(
        row: RawRow,
        issuances?: IssuanceRow[],
        lifecycle?: { totalIssued: number; totalRetired: number; totalActive: number },
    ): MethodologyRow {
        // findById passes lifecycle explicitly; findAll supplies it via the
        // LIFECYCLE_JOIN lateral columns on the raw row.
        const resolvedLifecycle = lifecycle ?? (row.total_issued != null
            ? (() => {
                const issued = parseInt(row.total_issued!, 10);
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

        // sectoralScopes arrives as a JSONB array of policyMapping entries.
        // Each entry has a `schemaName` field holding the actual scope value.
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
        // emissionReductionApproach arrives as a JSONB array of policyMapping
        // entries (one per matching source); the resolved label lives in
        // entry.schemaName. Pick the first non-empty value.
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
            totalIssued: resolvedLifecycle?.totalIssued,
            totalRetired: resolvedLifecycle?.totalRetired,
            totalActive: resolvedLifecycle?.totalActive,
            decodeStatus: row.decode_status ?? null,
            policySourceCid: row.policy_source_cid ?? null,
        };
    }
}
