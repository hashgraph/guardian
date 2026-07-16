import { DataSource } from 'typeorm';
import { MV_METHODOLOGY_STATS_NAME } from '@shared/materialized-views';
import {
    MethodologyRepository,
    MethodologyListQuery,
    MethodologyListResult,
    MethodologyRow,
    MethodologyStatsRow,
    IssuanceRow,
    MethodologyExportFilters,
    MethodologyExportRow,
} from './methodology.repository';
import { QueryBuilder } from './query-builder';
import { METHODOLOGY_FIELD_SCHEMA } from './schemas/methodology.schema';

/** Batch size for the internally-batched `findAllForExport` LIMIT/OFFSET loop. */
const EXPORT_BATCH_SIZE = 2000;

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
}

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

/** Effective decode status for display + filtering; maps policy.decodeStatus ('decoded'/'pending'/'failed') to the public API vocabulary ('success'/'pending'/'failed'). */
const EFFECTIVE_DECODE_STATUS = `
    CASE
        WHEN p."decodeStatus" = 'decoded' THEN 'success'
        ELSE p."decodeStatus"
    END
`;

const SEARCH_TSVECTOR = `(
    setweight(to_tsvector('english', coalesce(bv."displayName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bv."registryDid", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bv."searchText", '')), 'C')
)`;

/** The `message` row backing this METHODOLOGY's own originating VC (`business_view.sourceTimestamp` = `message.consensusTimestamp`), supplying `source_system_id`/`ipfs_document_ref` for `findAllForExport`. */
const SOURCE_MESSAGE_JOIN = `
    LEFT JOIN message src_msg ON src_msg."consensusTimestamp" = bv."sourceTimestamp"
`;

const METHODOLOGY_CANONICAL_DEDUP = `
    (
        bv."relatedTopicId" IS NULL
        OR bv.id = (
            SELECT b2.id
            FROM business_view b2
            WHERE b2."viewType" = 'METHODOLOGY'
              AND b2."relatedTopicId" = bv."relatedTopicId"
            ORDER BY b2."sourceTimestamp"::numeric DESC, b2.id DESC
            LIMIT 1
        )
    )
`;

/** LATERAL subquery that computes totalIssued/totalRetired for each methodology in the list, mirroring findById's primary path: sums project_mint_link mint amounts for totalIssued and counts deleted nft_cache serials for totalRetired. */
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

/** PostgreSQL implementation of the MethodologyRepository; generic filter/sort logic is delegated to QueryBuilder + METHODOLOGY_FIELD_SCHEMA, while full-text search, MV joins, and ranking remain explicit since they don't fit the generic operator model. */
export class PgMethodologyRepository extends MethodologyRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: MethodologyListQuery): Promise<MethodologyListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(METHODOLOGY_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'METHODOLOGY'`);
        // Keep one row per methodology so duplicate-message rows (same relatedTopicId) don't surface as repeated list entries.
        builder.addClause(METHODOLOGY_CANONICAL_DEDUP);

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

        // decodeStatus filter uses the EFFECTIVE status so 'success' includes policies whose schemas are imported
        // even if a recent retry flipped status to 'failed'; supports pipe-separated multi-values (e.g. "success|failed").
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

        // Count query reuses the same WHERE and LATERAL join (so filters referencing `reg.registry_name` resolve
        // correctly), but skips the stats MV join and the LIMIT/OFFSET params.
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

        // Aggregate lifecycle stats for NFT tokens: total minted (all serials) and total retired (serials marked
        // deleted by Mirror Node). Fungible tokens don't have per-serial tracking so their supply is used as-is.
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

    /** Full filtered, `relatedTopicId`-deduped methodologies dataset for the export engine; batches internally via a LIMIT/OFFSET loop ordered by `sourceTimestamp`. */
    async findAllForExport(filters: MethodologyExportFilters): Promise<MethodologyExportRow[]> {
        const builder = new QueryBuilder(METHODOLOGY_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'METHODOLOGY'`);
        builder.addClause(METHODOLOGY_CANONICAL_DEDUP);

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
                SELECT
                    bv."displayName" AS name,
                    reg.registry_name,
                    bv."businessData"->'options'->>'version' AS version,
                    p."policyMapping"->'emissionReductionApproach' AS emission_reduction_approach,
                    COALESCE(s.project_count, 0) AS project_count,
                    bv."relatedTopicId",
                    src_msg."dataSource",
                    src_msg.files AS "ipfsCids"
                FROM business_view bv
                LEFT JOIN ${MV_METHODOLOGY_STATS_NAME} s
                    ON s."relatedTopicId" = bv."relatedTopicId"
                ${REGISTRY_NAME_JOIN}
                ${POLICY_DECODE_STATUS_JOIN}
                ${SOURCE_MESSAGE_JOIN}
                WHERE ${whereSql}
                ORDER BY bv."sourceTimestamp" ASC
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

            const batch: RawExportRow[] = await this.dataSource.query(batchSql, params);
            rows.push(...batch.map(PgMethodologyRepository.mapExportRow));

            if (batch.length < EXPORT_BATCH_SIZE) break;
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
    ): MethodologyRow {
        // findById passes lifecycle explicitly; findAll supplies it via the LIFECYCLE_JOIN lateral columns on the raw row.
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
            totalIssued: resolvedLifecycle?.totalIssued,
            totalRetired: resolvedLifecycle?.totalRetired,
            totalActive: resolvedLifecycle?.totalActive,
            decodeStatus: row.decode_status ?? null,
            policySourceCid: row.policy_source_cid ?? null,
        };
    }
}
