import { DataSource } from 'typeorm';
import {
    CreditRepository,
    CreditListQuery,
    CreditListResult,
    CreditRow,
    CreditRawDetail,
    CreditProjectLink,
    CreditExportFilters,
    CreditExportRow,
} from './credit.repository';
import { QueryBuilder } from './query-builder';
import { CREDIT_FIELD_SCHEMA } from './schemas/credit.schema';

/** Batch size for the internally-batched `findAllForExport` LIMIT/OFFSET loop. */
const EXPORT_BATCH_SIZE = 2000;

interface RawRow {
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    /** Raw type from token_cache: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE' | null */
    raw_type: string | null;
    /** Fallback token type from businessData->options->tokenType (findRaw only) */
    options_token_type: string | null;
    total_supply: string | null;
    registryDid: string | null;
    registry_name: string | null;
    mint_date: Date | null;
    project_id: string | null;
    project_name: string | null;
    methodology_id: string | null;
    methodology_name: string | null;
}

/** Raw row shape for `findAllForExport` — one MintToken VC per row (see `CreditExportRow` doc). */
interface RawExportRow {
    _consensusTimestamp: string | null;
    _tokenId: string | null;
    _topicId: string | null;
    _dataSource: string | null;
    _ipfsCids: string[] | null;
    project_name: string | null;
    registry_name: string | null;
    proj_developer: string | null;
    proj_country: string | null;
    proj_vintage: string | null;
    emissions_reduced: string | null;
    mint_date: Date | string | null;
    standard: string | null;
    mitigation_type_raw: unknown;
}

// credentialSubject[0] tokenId path — used in SELECT, WHERE, GROUP BY, and ORDER BY
const TOKEN_ID_EXPR = `(m.documents->'credentialSubject'->0->>'tokenId')`;

/**
 * Base FROM clause: every MintToken VC in the message table, LEFT JOINed with
 * project_mint_link (pre-computed per-project attribution) and token_cache.
 * Rows where pml.* is NULL are unattributed mints — still included so the
 * table is complete regardless of worker attribution state.
 */
const MINT_FROM = `
    message m
    LEFT JOIN project_mint_link pml
           ON pml.mint_consensus_timestamp = m."consensusTimestamp"
    LEFT JOIN token_cache tc
           ON tc."tokenId" = ${TOKEN_ID_EXPR}
`;

/**
 * LATERAL: resolve project metadata from the pre-attributed project_mint_link
 * row. Returns NULL for all fields when pml.project_key is NULL.
 */
const PROJECT_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            bv_proj."projectKey"                   AS project_id,
            bv_proj."displayName"                  AS project_name,
            bv_proj."relatedTopicId"               AS proj_topic_id,
            bv_proj."businessData"->>'methodology' AS proj_methodology_name,
            bv_proj."registryDid"                  AS registry_did,
            bv_proj."businessData"->>'developer'   AS proj_developer,
            bv_proj."businessData"->>'country'     AS proj_country,
            bv_proj."businessData"->>'vintage'     AS proj_vintage
        FROM business_view bv_proj
        WHERE bv_proj."viewType"   = 'PROJECT'
          AND bv_proj."projectKey" = pml.project_key
        LIMIT 1
    ) proj ON true
`;

/**
 * LATERAL: resolve methodology from the project's instance topic, with a
 * displayName fallback for cases where relatedTopicId chain is not yet linked.
 * Emits relatedTopicId as methodology_id so links match the methodology detail route.
 * Returns NULL when no project was resolved (unattributed mints).
 */
const METHODOLOGY_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            bv_meth."relatedTopicId" AS methodology_id,
            bv_meth."displayName"    AS methodology_name,
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
              bv_meth."relatedTopicId" = proj.proj_topic_id
              OR bv_meth."displayName" = proj.proj_methodology_name
          )
        ORDER BY
            (bv_meth."relatedTopicId" = proj.proj_topic_id) DESC,
            bv_meth."sourceTimestamp"::numeric DESC NULLS LAST,
            bv_meth."createdAt" DESC NULLS LAST
        LIMIT 1
    ) meth ON true
`;

/**
 * LATERAL: resolve registry display name from the project's registryDid.
 * Returns NULL when no project was resolved (unattributed mints).
 */
const REGISTRY_JOIN = `
    LEFT JOIN LATERAL (
        SELECT bv_reg."displayName" AS registry_name
        FROM business_view bv_reg
        WHERE bv_reg."viewType"    = 'REGISTRY'
          AND bv_reg."registryDid" = proj.registry_did
        ORDER BY bv_reg."createdAt" DESC NULLS LAST
        LIMIT 1
    ) reg ON true
`;

/**
 * GROUP BY: one output row per (tokenId, project_key) pair.
 * Metadata columns (tc.*, proj.*, meth.*, reg.*) are functionally determined
 * by these two keys but must be listed explicitly for PostgreSQL.
 */
const GROUP_BY = `
    GROUP BY
        ${TOKEN_ID_EXPR},
        pml.project_key,
        tc.name, tc.symbol, tc.type,
        proj.project_id, proj.project_name, proj.proj_topic_id,
        proj.proj_methodology_name, proj.registry_did,
        meth.methodology_id, meth.methodology_name,
        reg.registry_name
`;

/** PostgreSQL implementation of the CreditRepository; `findAll()` sources MintToken VC documents joined with `project_mint_link` for per-project attribution, including unattributed mints as rows with null project/methodology/registry fields. */
export class PgCreditRepository extends CreditRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: CreditListQuery): Promise<CreditListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(CREDIT_FIELD_SCHEMA);

        // Base: only MintToken VC documents with a resolvable tokenId
        builder.addClause(`m.type = 'VC-Document'`);
        builder.addClause(`m.documents IS NOT NULL`);
        builder.addClause(`(m.documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'`);
        builder.addClause(`${TOKEN_ID_EXPR} IS NOT NULL`);

        // Generic schema-driven filters
        builder.addFilters({
            registryDid: query.registryDid,
            registry:    query.registry,
            tokenId:     query.tokenId,
        });

        // projectKey: restrict to mints attributed to this specific project
        if (query.projectKey) {
            const param = builder.nextParam(query.projectKey);
            builder.addClause(`pml.project_key = ${param}`);
        }

        // methodologyId: restrict to mints whose resolved methodology matches
        if (query.methodologyId) {
            const param = builder.nextParam(query.methodologyId);
            builder.addClause(`meth.methodology_id = ${param}`);
        }

        // type: map display form to token_cache raw values
        if (query.type) {
            const normalised = query.type.toLowerCase();
            if (normalised === 'fungible') {
                builder.addClause(`tc.type = 'FUNGIBLE_COMMON'`);
            } else if (normalised === 'non-fungible') {
                builder.addClause(`tc.type = 'NON_FUNGIBLE_UNIQUE'`);
            }
        }

        // Full-text + fuzzy search across token name, symbol, id, and registry
        let rankExpr = '0';
        if (search) {
            const term = search.trim();
            const likeParam = builder.nextParam(`%${term}%`);
            const simParam  = builder.nextParam(term);

            builder.addClause(`(
                tc.name ILIKE ${likeParam}
                OR tc.symbol ILIKE ${likeParam}
                OR ${TOKEN_ID_EXPR} ILIKE ${likeParam}
                OR reg.registry_name ILIKE ${likeParam}
                OR similarity(COALESCE(tc.name, ''), ${simParam}) > 0.3
            )`);

            rankExpr = `COALESCE(similarity(COALESCE(tc.name, ''), ${simParam}), 0)`;
        }

        const orderBy = search
            ? `search_rank DESC, mint_date DESC NULLS LAST`
            : builder.buildOrderBy({
                sortBy,
                sortDir,
                defaultExpr: 'mint_date DESC NULLS LAST',
            });

        const whereSql = builder.getWhereClause();
        const params   = builder.getParams();

        const limitParam  = builder.nextParam(limit);
        const offsetParam = builder.nextParam(offset);

        // Supply = SUM of credentialSubject[0].amount from MintToken VCs (pre-parsed BIGINT for attributed mints, raw JSONB cast otherwise).
        const rowsSql = `
            SELECT
                ${TOKEN_ID_EXPR}                                                                AS "tokenId",
                tc.name,
                tc.symbol,
                tc.type                                                                         AS raw_type,
                NULL::text                                                                      AS options_token_type,
                COALESCE(SUM(COALESCE(pml.amount::numeric,
                    (m.documents->'credentialSubject'->0->>'amount')::numeric
                )), 0)                                                                          AS total_supply,
                proj.registry_did                                                               AS "registryDid",
                reg.registry_name,
                MIN(COALESCE(pml.mint_date,
                    to_timestamp(m."consensusTimestamp"::numeric)
                ))                                                                              AS mint_date,
                proj.project_id,
                proj.project_name,
                meth.methodology_id,
                COALESCE(meth.methodology_name, proj.proj_methodology_name)                    AS methodology_name,
                ${rankExpr}                                                                     AS search_rank
            FROM ${MINT_FROM}
            ${PROJECT_JOIN}
            ${METHODOLOGY_JOIN}
            ${REGISTRY_JOIN}
            WHERE ${whereSql}
            ${GROUP_BY}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count: number of distinct (tokenId, project_key) groups after filtering; metadata columns are omitted from GROUP BY since they don't affect the count.
        const countParams = params.slice(0, params.length - 2);
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM (
                SELECT 1
                FROM ${MINT_FROM}
                ${PROJECT_JOIN}
                ${METHODOLOGY_JOIN}
                ${REGISTRY_JOIN}
                WHERE ${whereSql}
                GROUP BY ${TOKEN_ID_EXPR}, pml.project_key
            ) cnt
        `;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, params),
            this.dataSource.query(countSql, countParams),
        ]);

        return {
            rows: rawRows.map(row => PgCreditRepository.mapRow(row)),
            total: countResult[0]?.total ?? 0,
        };
    }

    private static mapRow(row: RawRow): CreditRow {
        return {
            tokenId: row.tokenId ?? null,
            name: row.name ?? null,
            symbol: row.symbol ?? null,
            type: PgCreditRepository.normaliseType(row.raw_type, row.options_token_type),
            supply: row.total_supply != null ? parseFloat(row.total_supply) : 0,
            projectId: row.project_id ?? null,
            project: row.project_name ?? null,
            methodologyId: row.methodology_id ?? null,
            methodology: row.methodology_name ?? null,
            registry: row.registry_name ?? null,
            registryDid: row.registryDid ?? null,
            mintDate: row.mint_date ? row.mint_date.toISOString() : null,
        };
    }

    /** Maps raw token type strings to the normalised display values; prefers token_cache.type (set by the worker from Mirror Node), falling back to businessData->options->tokenType (set by the Guardian policy message). */
    private static normaliseType(
        rawType: string | null,
        optionsTokenType: string | null,
    ): 'Fungible' | 'Non-Fungible' | null {
        if (rawType) {
            if (rawType === 'FUNGIBLE_COMMON') return 'Fungible';
            if (rawType === 'NON_FUNGIBLE_UNIQUE') return 'Non-Fungible';
        }
        if (optionsTokenType) {
            const lower = optionsTokenType.toLowerCase();
            if (lower === 'fungible') return 'Fungible';
            if (lower === 'non-fungible') return 'Non-Fungible';
        }
        return null;
    }

    /** Full filtered credits dataset for the export engine — one row per mint event (not aggregated by tokenId+project like `findAll`) so `transaction_id` never collapses distinct transactions into one row; batches internally via a LIMIT/OFFSET loop ordered by consensus timestamp. */
    async findAllForExport(filters: CreditExportFilters): Promise<CreditExportRow[]> {
        const builder = new QueryBuilder(CREDIT_FIELD_SCHEMA);

        builder.addClause(`m.type = 'VC-Document'`);
        builder.addClause(`m.documents IS NOT NULL`);
        builder.addClause(`(m.documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'`);
        builder.addClause(`${TOKEN_ID_EXPR} IS NOT NULL`);

        builder.addFilters({
            registryDid: filters.registryDid,
            registry: filters.registry,
            tokenId: filters.tokenId,
        });

        if (filters.projectKey) {
            const param = builder.nextParam(filters.projectKey);
            builder.addClause(`pml.project_key = ${param}`);
        }

        if (filters.methodologyId) {
            const param = builder.nextParam(filters.methodologyId);
            builder.addClause(`meth.methodology_id = ${param}`);
        }

        if (filters.type) {
            const normalised = filters.type.toLowerCase();
            if (normalised === 'fungible') {
                builder.addClause(`tc.type = 'FUNGIBLE_COMMON'`);
            } else if (normalised === 'non-fungible') {
                builder.addClause(`tc.type = 'NON_FUNGIBLE_UNIQUE'`);
            }
        }

        if (filters.search) {
            const term = filters.search.trim();
            const likeParam = builder.nextParam(`%${term}%`);
            const simParam = builder.nextParam(term);

            builder.addClause(`(
                tc.name ILIKE ${likeParam}
                OR tc.symbol ILIKE ${likeParam}
                OR ${TOKEN_ID_EXPR} ILIKE ${likeParam}
                OR reg.registry_name ILIKE ${likeParam}
                OR similarity(COALESCE(tc.name, ''), ${simParam}) > 0.3
            )`);
        }

        const whereSql = builder.getWhereClause();
        const baseParams = builder.getParams();
        const limitParam = `$${baseParams.length + 1}`;
        const offsetParam = `$${baseParams.length + 2}`;

        const rows: CreditExportRow[] = [];
        for (let offset = 0; ; offset += EXPORT_BATCH_SIZE) {
            const params = [...baseParams, EXPORT_BATCH_SIZE, offset];

            const batchSql = `
                SELECT
                    m."consensusTimestamp"                                                          AS "_consensusTimestamp",
                    ${TOKEN_ID_EXPR}                                                                AS "_tokenId",
                    m."topicId"                                                                      AS "_topicId",
                    m."dataSource"                                                                   AS "_dataSource",
                    m.files                                                                          AS "_ipfsCids",
                    proj.project_name,
                    reg.registry_name,
                    proj.proj_developer,
                    proj.proj_country,
                    proj.proj_vintage,
                    COALESCE(pml.amount::numeric, (m.documents->'credentialSubject'->0->>'amount')::numeric) AS emissions_reduced,
                    COALESCE(pml.mint_date, to_timestamp(m."consensusTimestamp"::numeric))            AS mint_date,
                    COALESCE(meth.methodology_name, proj.proj_methodology_name)                       AS standard,
                    meth.emission_reduction_approach                                                   AS mitigation_type_raw
                FROM ${MINT_FROM}
                ${PROJECT_JOIN}
                ${METHODOLOGY_JOIN}
                ${REGISTRY_JOIN}
                WHERE ${whereSql}
                ORDER BY m."consensusTimestamp" ASC
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

            const batch: RawExportRow[] = await this.dataSource.query(batchSql, params);
            rows.push(...batch.map(PgCreditRepository.mapExportRow));

            if (batch.length < EXPORT_BATCH_SIZE) break;
        }

        return rows;
    }

    private static mapExportRow(row: RawExportRow): CreditExportRow {
        const mintDate = row.mint_date ? new Date(row.mint_date) : null;
        const cids = Array.isArray(row._ipfsCids)
            ? row._ipfsCids.filter((c): c is string => typeof c === 'string' && c.length > 0)
            : [];

        return {
            project_name: row.project_name ?? null,
            registry: row.registry_name ?? null,
            developer: row.proj_developer ?? null,
            country: row.proj_country ?? null,
            emissions_reduced: row.emissions_reduced != null ? parseFloat(row.emissions_reduced) : null,
            reporting_year: mintDate ? mintDate.getUTCFullYear() : null,
            mitigation_type: PgCreditRepository.extractEmissionReductionApproach(row.mitigation_type_raw),
            standard: row.standard ?? null,
            vintage: row.proj_vintage ?? null,
            ipfs_document_ref: cids.length > 0 ? cids.join('; ') : null,
            _consensusTimestamp: row._consensusTimestamp ?? null,
            _tokenId: row._tokenId ?? null,
            _topicId: row._topicId ?? null,
            _dataSource: row._dataSource ?? null,
        };
    }

    /** `emissionReductionApproach` arrives as a JSONB array of policyMapping entries; the resolved label lives in `entry.schemaName` (first non-empty value). Mirrors `PgMethodologyRepository`'s identical extraction logic, duplicated per this codebase's self-contained-repository convention. */
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

    /** Returns the underlying HCS messages backing a credit: the original Token message and any MintToken VC documents that minted credits against this token, used by the raw-data viewer. */
    async findRaw(tokenId: string): Promise<CreditRawDetail | null> {
        // 1. The full credit row (reusing the same JOINs as findAll).
        const creditRows: RawRow[] = await this.dataSource.query(
            `SELECT
                COALESCE(bv."businessData"->>'tokenId', tc."tokenId") AS "tokenId",
                COALESCE(bv."displayName", bv."businessData"->'options'->>'tokenName', tc.name) AS name,
                COALESCE(bv."businessData"->'options'->>'tokenSymbol', tc.symbol) AS symbol,
                tc.type AS raw_type,
                bv."businessData"->'options'->>'tokenType' AS options_token_type,
                tc."totalSupply"::text AS total_supply,
                bv."registryDid" AS "registryDid",
                reg.registry_name AS registry_name,
                to_char(to_timestamp(bv."sourceTimestamp"::numeric) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS mint_date,
                NULL::jsonb AS "businessData",
                proj.project_id,
                proj.project_name,
                meth.methodology_id,
                COALESCE(meth.methodology_name, proj.proj_methodology_name) AS methodology_name
             FROM business_view bv
             LEFT JOIN token_cache tc ON tc."tokenId" = bv."businessData"->>'tokenId'
             LEFT JOIN LATERAL (
                 SELECT "displayName" AS registry_name
                 FROM business_view
                 WHERE "viewType" = 'REGISTRY' AND "registryDid" = bv."registryDid"
                 ORDER BY "createdAt" DESC NULLS LAST
                 LIMIT 1
             ) reg ON true
             LEFT JOIN LATERAL (
                 SELECT
                     bv_proj."projectKey"                    AS project_id,
                     bv_proj."displayName"                   AS project_name,
                     bv_proj."relatedTopicId"                AS proj_topic_id,
                     bv_proj."businessData"->>'methodology'  AS proj_methodology_name
                 FROM project_mint_link pml
                 JOIN business_view bv_proj
                     ON bv_proj."projectKey" = pml.project_key
                    AND bv_proj."viewType" = 'PROJECT'
                 WHERE pml.token_id = bv."businessData"->>'tokenId'
                 ORDER BY pml.mint_consensus_timestamp DESC
                 LIMIT 1
             ) proj ON true
             LEFT JOIN LATERAL (
                 SELECT
                     bv_meth."relatedTopicId" AS methodology_id,
                     bv_meth."displayName"    AS methodology_name
                 FROM business_view bv_meth
                 WHERE bv_meth."viewType" = 'METHODOLOGY'
                   AND (
                       bv_meth."relatedTopicId" = COALESCE(proj.proj_topic_id, bv."relatedTopicId")
                       OR bv_meth."displayName" = proj.proj_methodology_name
                   )
                 ORDER BY
                     (bv_meth."relatedTopicId" = COALESCE(proj.proj_topic_id, bv."relatedTopicId")) DESC,
                     bv_meth."sourceTimestamp"::numeric DESC NULLS LAST,
                     bv_meth."createdAt" DESC NULLS LAST
                 LIMIT 1
             ) meth ON true
             WHERE bv."viewType" = 'CREDIT' AND bv."businessData"->>'tokenId' = $1
             LIMIT 1`,
            [tokenId],
        );

        const credit: CreditRow | null = creditRows[0] ? {
            tokenId: creditRows[0].tokenId,
            name: creditRows[0].name,
            symbol: creditRows[0].symbol,
            type: PgCreditRepository.normaliseType(creditRows[0].raw_type, creditRows[0].options_token_type),
            supply: parseFloat(creditRows[0].total_supply ?? '0') || 0,
            projectId: creditRows[0].project_id ?? null,
            project: creditRows[0].project_name ?? null,
            methodologyId: creditRows[0].methodology_id ?? null,
            methodology: creditRows[0].methodology_name ?? null,
            registry: creditRows[0].registry_name ?? null,
            registryDid: creditRows[0].registryDid,
            mintDate: creditRows[0].mint_date instanceof Date
                ? creditRows[0].mint_date.toISOString()
                : (creditRows[0].mint_date ?? null),
        } : null;

        // 2. The raw Token message from HCS.
        const tokenMessageRows: Array<Record<string, unknown>> = await this.dataSource.query(
            `SELECT "consensusTimestamp", "topicId", owner, uuid, type, action, status, options, files, topics, tokens, "sequenceNumber", "lastUpdate", "createdAt"
             FROM message
             WHERE type = 'Token' AND options->>'tokenId' = $1
             ORDER BY "consensusTimestamp" ASC
             LIMIT 1`,
            [tokenId],
        );
        const tokenMessage = tokenMessageRows[0] ?? null;

        // 2b. Resolve the policy governing this token via its linked project's originating VC message: neither
        //     the Token-creation message nor MintToken VCs carry a policyId, so join back through
        //     business_view.sourceTimestamp -> message.consensusTimestamp to recover it.
        let policyId: string | null = null;
        let policyName: string | null = null;
        let policyTopicId: string | null = null;
        if (credit?.projectId) {
            const projectPolicyRows: Array<{ policyId: string | null }> = await this.dataSource.query(
                `SELECT m."policyId"
                 FROM business_view bv
                 JOIN message m ON m."consensusTimestamp" = bv."sourceTimestamp"
                 WHERE bv."viewType" = 'PROJECT' AND bv."projectKey" = $1
                 LIMIT 1`,
                [credit.projectId],
            );
            policyId = projectPolicyRows[0]?.policyId ?? null;
        }
        if (policyId) {
            const policyNameRows: Array<{ policyName: string | null; policyTopicId: string | null }> = await this.dataSource.query(
                `SELECT ip.options->>'name' AS "policyName",
                        p."policyTopicId"   AS "policyTopicId"
                 FROM policy p
                 JOIN message ip
                     ON ip.type = 'Instance-Policy'
                    AND ip.action = 'publish-policy'
                    AND ip."topicId" = p."policyTopicId"
                 WHERE p."policyId" = $1
                 ORDER BY ip."consensusTimestamp" DESC
                 LIMIT 1`,
                [policyId],
            );
            policyName = policyNameRows[0]?.policyName ?? null;
            policyTopicId = policyNameRows[0]?.policyTopicId ?? null;
        }

        // 3. MintToken VC documents that minted credits for this tokenId.
        const mintRows: Array<{
            consensusTimestamp: string;
            topicId: string;
            amount: string | null;
            date: string | null;
            document: Record<string, unknown> | null;
            projectKey: string | null;
            type: string | null;
        }> = await this.dataSource.query(
            `SELECT
                m."consensusTimestamp",
                m."topicId",
                m.documents->'credentialSubject'->0->>'amount' AS amount,
                m.documents->'credentialSubject'->0->>'date'   AS date,
                m.documents                                    AS document,
                pml.project_key                                AS "projectKey",
                m.documents->'credentialSubject'->0->>'type'  AS type
             FROM message m
             LEFT JOIN project_mint_link pml
                 ON pml.mint_consensus_timestamp = m."consensusTimestamp"
                AND pml.token_id = $1
             WHERE m.type = 'VC-Document'
               AND m.documents IS NOT NULL
               AND m.documents->'credentialSubject'->0->>'type'    LIKE 'MintToken%'
               AND m.documents->'credentialSubject'->0->>'tokenId' = $1
             ORDER BY m."consensusTimestamp" ASC
             LIMIT 200`,
            [tokenId],
        );

        // 4. All distinct projects linked to this tokenId (not just the most recent).
        const projectRows: Array<{ project_id: string | null; project_name: string | null }> =
            await this.dataSource.query(
                `SELECT DISTINCT
                     bv_proj."projectKey"  AS project_id,
                     bv_proj."displayName" AS project_name
                 FROM project_mint_link pml
                 JOIN business_view bv_proj
                     ON bv_proj."projectKey" = pml.project_key
                    AND bv_proj."viewType" = 'PROJECT'
                 WHERE pml.token_id = $1
                 ORDER BY bv_proj."displayName" ASC NULLS LAST`,
                [tokenId],
            );

        const projects: CreditProjectLink[] = projectRows.map(r => ({
            projectId: r.project_id ?? null,
            project: r.project_name ?? null,
        }));

        if (!credit && !tokenMessage && mintRows.length === 0 && projects.length === 0) return null;

        return {
            credit,
            projects,
            tokenMessage,
            policyId,
            policyName,
            policyTopicId,
            mintEvents: mintRows,
        };
    }
}
