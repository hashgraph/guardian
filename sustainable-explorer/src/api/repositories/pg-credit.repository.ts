import { DataSource } from 'typeorm';
import { CreditRepository, CreditListQuery, CreditListResult, CreditRow, CreditRawDetail } from './credit.repository';
import { QueryBuilder } from './query-builder';
import { CREDIT_FIELD_SCHEMA } from './schemas/credit.schema';

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
            bv_proj."registryDid"                  AS registry_did
        FROM business_view bv_proj
        WHERE bv_proj."viewType"   = 'PROJECT'
          AND bv_proj."projectKey" = pml.project_key
        LIMIT 1
    ) proj ON true
`;

/**
 * LATERAL: resolve methodology from the project's instance topic.
 * Returns NULL when no project was resolved (unattributed mints).
 */
const METHODOLOGY_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            bv_meth."sourceTimestamp" AS methodology_id,
            bv_meth."displayName"     AS methodology_name
        FROM business_view bv_meth
        WHERE bv_meth."viewType"       = 'METHODOLOGY'
          AND bv_meth."relatedTopicId" = proj.proj_topic_id
        ORDER BY bv_meth."createdAt" DESC NULLS LAST
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

/**
 * PostgreSQL implementation of the CreditRepository.
 *
 * findAll() is sourced from MintToken VC documents (message table) joined with
 * project_mint_link for per-project attribution. Supply figures are
 * SUM(credentialSubject[0].amount) — the actual minted amounts — consistent
 * with what the project and methodology detail pages show.
 *
 * Unattributed mints (not yet resolved by the worker) are included as rows
 * with null project / methodology / registry fields.
 *
 * findRaw() is unchanged — it reads business_view CREDIT rows for the header
 * and the message table for the raw mint events.
 */
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

        // Supply = SUM of credentialSubject[0].amount from MintToken VCs.
        // For attributed mints pml.amount is the pre-parsed BIGINT; for
        // unattributed mints it falls back to the raw JSONB string cast.
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

        // Count: number of distinct (tokenId, project_key) groups after filtering.
        // Uses a simplified GROUP BY — metadata columns are omitted because they
        // are functionally determined by (tokenId, project_key) and don't affect
        // the group count.
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

    /**
     * Maps raw token type strings to the normalised display values.
     *
     * Priority:
     *  1. token_cache.type (set by the token sync worker from Mirror Node)
     *  2. businessData->options->tokenType (set by the Guardian policy message)
     */
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

    /**
     * Returns the underlying HCS messages backing a credit: the original Token
     * message and any MintToken VC documents that minted credits against this
     * token. Used by the raw-data viewer on the credits page.
     */
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
                     bv_meth."sourceTimestamp" AS methodology_id,
                     bv_meth."displayName"     AS methodology_name
                 FROM business_view bv_meth
                 WHERE bv_meth."viewType" = 'METHODOLOGY'
                   AND bv_meth."relatedTopicId" = COALESCE(proj.proj_topic_id, bv."relatedTopicId")
                 ORDER BY bv_meth."createdAt" DESC NULLS LAST
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

        // 3. MintToken VC documents that minted credits for this tokenId.
        const mintRows: Array<{
            consensusTimestamp: string;
            topicId: string;
            amount: string | null;
            date: string | null;
            document: Record<string, unknown> | null;
        }> = await this.dataSource.query(
            `SELECT
                "consensusTimestamp",
                "topicId",
                documents->'credentialSubject'->0->>'amount' AS amount,
                documents->'credentialSubject'->0->>'date'   AS date,
                documents->'credentialSubject'->0           AS document
             FROM message
             WHERE type = 'VC-Document'
               AND documents IS NOT NULL
               AND documents->'credentialSubject'->0->>'type'    LIKE 'MintToken%'
               AND documents->'credentialSubject'->0->>'tokenId' = $1
             ORDER BY "consensusTimestamp" ASC
             LIMIT 200`,
            [tokenId],
        );

        if (!credit && !tokenMessage && mintRows.length === 0) return null;

        return {
            credit,
            tokenMessage,
            mintEvents: mintRows,
        };
    }
}
