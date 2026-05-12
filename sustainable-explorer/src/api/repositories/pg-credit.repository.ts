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
    /** Fallback token type from businessData->options->tokenType */
    options_token_type: string | null;
    total_supply: string | null;
    registryDid: string | null;
    registry_name: string | null;
    mint_date: Date | null;
    businessData: Record<string, any> | null;
    project_id: string | null;
    project_name: string | null;
}

/**
 * LATERAL subquery joined into findAll to look up the publishing registry's
 * display name. Uses LATERAL so we can ORDER BY + LIMIT 1 to handle the (rare)
 * case of multiple REGISTRY rows for one DID.
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
 * Resolves the linked project for a credit by walking the MintToken VC chain:
 *
 *   tokenId  →  MintToken VC (in some topic)
 *            →  the most-recent prior data VC (cs.id IS NOT NULL) in the same topic
 *            →  that cs.id is the project's projectKey in business_view PROJECT.
 *
 * We pick the most recent MintToken VC for the token, then look back for the
 * latest data VC before it. Joins to the PROJECT row for the display name.
 *
 * For credits with no minting activity (or no data VC preceding the mint), both
 * project_id and project_name come back null and the frontend shows "Unknown
 * Project" — same fallback as before.
 */
const PROJECT_LINK_JOIN = `
    LEFT JOIN LATERAL (
        SELECT
            proj.cs_id           AS project_id,
            bv_proj."displayName" AS project_name
        FROM (
            SELECT (
                SELECT m_proj.documents->'credentialSubject'->0->>'id'
                FROM message m_proj
                WHERE m_proj.type = 'VC-Document'
                  AND m_proj.documents IS NOT NULL
                  AND m_proj."topicId" = mt."topicId"
                  AND m_proj."consensusTimestamp" < mt."consensusTimestamp"
                  AND m_proj.documents->'credentialSubject'->0->>'id' IS NOT NULL
                ORDER BY m_proj."consensusTimestamp" DESC
                LIMIT 1
            ) AS cs_id
            FROM message mt
            WHERE mt.type = 'VC-Document'
              AND mt.documents IS NOT NULL
              AND mt.documents->'credentialSubject'->0->>'type' = 'MintToken'
              AND mt.documents->'credentialSubject'->0->>'tokenId'
                  = COALESCE(bv."businessData"->>'tokenId', tc."tokenId")
            ORDER BY mt."consensusTimestamp" DESC
            LIMIT 1
        ) AS proj
        LEFT JOIN business_view bv_proj
            ON bv_proj."viewType" = 'PROJECT'
           AND bv_proj."projectKey" = proj.cs_id
    ) proj ON true
`;

/**
 * PostgreSQL implementation of the CreditRepository.
 *
 * Generic filter and sort logic is delegated to QueryBuilder + the field
 * schema (CREDIT_FIELD_SCHEMA). Adding a new filterable/sortable column only
 * requires updating the schema — no SQL changes needed here.
 *
 * Special operations (full-text + fuzzy search) remain explicit.
 */
export class PgCreditRepository extends CreditRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: CreditListQuery): Promise<CreditListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(CREDIT_FIELD_SCHEMA);
        builder.addClause(`bv."viewType" = 'CREDIT'`);

        // Generic filters
        builder.addFilters({
            registryDid: query.registryDid,
            registry: query.registry,
            tokenId: query.tokenId,
        });

        // type filter: accept display form ('Fungible'/'Non-Fungible') and map to
        // token_cache raw values before filtering.
        if (query.type) {
            const normalised = query.type.toLowerCase();
            if (normalised === 'fungible') {
                builder.addClause(`(
                    tc.type = 'FUNGIBLE_COMMON'
                    OR (tc.type IS NULL AND LOWER(bv."businessData"->'options'->>'tokenType') = 'fungible')
                )`);
            } else if (normalised === 'non-fungible') {
                builder.addClause(`(
                    tc.type = 'NON_FUNGIBLE_UNIQUE'
                    OR (tc.type IS NULL AND LOWER(bv."businessData"->'options'->>'tokenType') = 'non-fungible')
                )`);
            }
        }

        // Full-text + fuzzy search across name, symbol, tokenId, registry name
        let rankExpr = '0';
        if (search) {
            const term = search.trim();
            const tsParam = builder.nextParam(term);
            const likeParam = builder.nextParam(`%${term}%`);
            const simParam = builder.nextParam(term);

            builder.addClause(`(
                bv."searchVector" @@ plainto_tsquery('english', ${tsParam})
                OR COALESCE(tc.name, bv."displayName") ILIKE ${likeParam}
                OR tc.symbol ILIKE ${likeParam}
                OR COALESCE(tc."tokenId", bv."businessData"->>'tokenId') ILIKE ${likeParam}
                OR reg.registry_name ILIKE ${likeParam}
                OR similarity(COALESCE(COALESCE(tc.name, bv."displayName"), ''), ${simParam}) > 0.3
            )`);

            rankExpr = `
                ts_rank(bv."searchVector", plainto_tsquery('english', ${tsParam}))
                + COALESCE(similarity(COALESCE(tc.name, bv."displayName"), ${simParam}), 0)
            `;
        }

        const orderBy = search
            ? `search_rank DESC, bv."createdAt" DESC`
            : builder.buildOrderBy({
                sortBy,
                sortDir,
                defaultExpr: 'bv."createdAt" DESC NULLS LAST',
            });

        const whereSql = builder.getWhereClause();
        const params = builder.getParams();

        const limitParam = builder.nextParam(limit);
        const offsetParam = builder.nextParam(offset);

        const rowsSql = `
            SELECT
                COALESCE(tc."tokenId", bv."businessData"->>'tokenId')     AS "tokenId",
                COALESCE(tc.name,      bv."displayName")                   AS name,
                COALESCE(tc.symbol,    bv."businessData"->>'symbol')       AS symbol,
                tc.type                                                     AS raw_type,
                bv."businessData"->'options'->>'tokenType'                 AS options_token_type,
                tc."totalSupply"                                           AS total_supply,
                bv."registryDid"                                           AS "registryDid",
                reg.registry_name,
                to_timestamp(bv."sourceTimestamp"::numeric)::timestamptz  AS mint_date,
                bv."businessData"                                          AS "businessData",
                proj.project_id                                            AS project_id,
                proj.project_name                                          AS project_name,
                ${rankExpr}                                                AS search_rank
            FROM business_view bv
            LEFT JOIN token_cache tc
                ON tc."tokenId" = bv."businessData"->>'tokenId'
            ${REGISTRY_NAME_JOIN}
            ${PROJECT_LINK_JOIN}
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        // Count query reuses the same WHERE + LATERAL join so registry filters resolve.
        const countParams = params.slice(0, params.length - 2);
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            LEFT JOIN token_cache tc
                ON tc."tokenId" = bv."businessData"->>'tokenId'
            ${REGISTRY_NAME_JOIN}
            WHERE ${whereSql}
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
                reg.registry_name AS registry,
                to_char(to_timestamp(bv."sourceTimestamp"::numeric) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS mint_date
             FROM business_view bv
             LEFT JOIN token_cache tc ON tc."tokenId" = bv."businessData"->>'tokenId'
             LEFT JOIN LATERAL (
                 SELECT "displayName" AS registry_name
                 FROM business_view
                 WHERE "viewType" = 'REGISTRY' AND "registryDid" = bv."registryDid"
                 ORDER BY "createdAt" DESC NULLS LAST
                 LIMIT 1
             ) reg ON true
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
            projectId: null,
            project: null,
            registry: creditRows[0].registry_name,
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
               AND documents->'credentialSubject'->0->>'type'    = 'MintToken'
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
