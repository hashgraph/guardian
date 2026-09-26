import { DataSource } from 'typeorm';
import { MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import {
    IssuanceRepository,
    IssuanceSummaryRow,
    IssuanceTokenInfoRow,
    RelatedIssuanceRow,
    RelatedIssuancesResult,
} from './issuance.repository';

const num = (v: string | number | null | undefined): number | null =>
    v === null || v === undefined || v === '' ? null : Number(v);

/**
 * PostgreSQL implementation of the issuance read model.
 *
 * `project_mint_link` is the join point: it is keyed by the MintToken
 * credential's consensus timestamp and already carries the reconciliation the
 * worker computed (declared vs actually minted, serial counts, status), so
 * nothing here recomputes it.
 */
export class PgIssuanceRepository extends IssuanceRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findSummary(mintConsensusTimestamp: string): Promise<IssuanceSummaryRow | null> {
        // Driven from the MintToken credential, not from project_mint_link.
        //
        // Most mint credentials are never attributed to a project — 2,344 of them
        // on testnet alone — and they are listed on the issuances page, so an
        // issuance page keyed on the link table would 404 for the majority of
        // rows a user can click. Everything the credential itself states (token,
        // declared amount, date) is shown; the project/methodology/registry
        // fields are simply null when nothing linked it.
        const [row] = await this.dataSource.query(
            `SELECT
                m."consensusTimestamp"                           AS "mintConsensusTimestamp",
                pml.vp_consensus_timestamp                       AS "vpConsensusTimestamp",
                COALESCE(
                    pml.amount,
                    NULLIF(m.documents->'credentialSubject'->0->>'amount', '')::numeric
                )::text                                          AS "declaredAmount",
                pml.minted_amount::text                          AS "mintedAmount",
                pml.mint_match_status                            AS "mintMatchStatus",
                to_char(
                    COALESCE(
                        pml.mint_date,
                        to_timestamp(m."consensusTimestamp"::numeric)
                    ) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'
                )                                                AS "mintDate",
                pml.serial_count                                 AS "serialCount",
                pml.serial_retired_count                         AS "serialRetiredCount",
                pml.serial_transferred_count                     AS "serialTransferredCount",
                COALESCE(pml.token_id, m.documents->'credentialSubject'->0->>'tokenId') AS "tokenId",
                tc.name                                          AS "tokenName",
                tc.symbol                                        AS "tokenSymbol",
                tc.type                                          AS "tokenType",
                proj."projectKey"                                AS "projectId",
                proj."displayName"                               AS "projectName",
                meth."relatedTopicId"                            AS "methodologyId",
                meth."displayName"                               AS "methodologyName",
                proj."registryDid"                               AS "registryDid",
                reg.registry_name                                AS "registryName"
             FROM message m
             LEFT JOIN project_mint_link pml
                 ON pml.mint_consensus_timestamp = m."consensusTimestamp"
             LEFT JOIN token_cache tc
                 ON tc."tokenId" = COALESCE(pml.token_id, m.documents->'credentialSubject'->0->>'tokenId')
             LEFT JOIN business_view proj
                 ON proj."projectKey" = pml.project_key AND proj."viewType" = 'PROJECT'
             LEFT JOIN LATERAL (
                 SELECT bv_meth."relatedTopicId", bv_meth."displayName"
                 FROM business_view bv_meth
                 WHERE bv_meth."viewType" = 'METHODOLOGY'
                   AND bv_meth."relatedTopicId" = proj."businessData"->>'instanceTopicId'
                 ORDER BY bv_meth."sourceTimestamp"::numeric DESC NULLS LAST
                 LIMIT 1
             ) meth ON true
             LEFT JOIN ${MV_REGISTRY_STATS_NAME} reg
                 ON reg."registryDid" = proj."registryDid"
             WHERE m."consensusTimestamp" = $1
               AND m.type = 'VC-Document'
               AND m.documents->'credentialSubject'->0->>'type' LIKE 'MintToken%'
             LIMIT 1`,
            [mintConsensusTimestamp],
        );

        if (!row) return null;

        return {
            ...row,
            declaredAmount: num(row.declaredAmount),
            mintedAmount: num(row.mintedAmount),
            serialCount: num(row.serialCount),
            serialRetiredCount: num(row.serialRetiredCount),
            serialTransferredCount: num(row.serialTransferredCount),
        };
    }

    async findTokenInfo(mintConsensusTimestamp: string): Promise<IssuanceTokenInfoRow | null> {
        // Same rule as findSummary: resolve from the credential so unattributed
        // mints still get their token context, with project_key simply null.
        const [link] = await this.dataSource.query(
            `SELECT COALESCE(pml.token_id, m.documents->'credentialSubject'->0->>'tokenId') AS token_id,
                    pml.project_key
             FROM message m
             LEFT JOIN project_mint_link pml ON pml.mint_consensus_timestamp = m."consensusTimestamp"
             WHERE m."consensusTimestamp" = $1
               AND m.type = 'VC-Document'
               AND m.documents->'credentialSubject'->0->>'type' LIKE 'MintToken%'
             LIMIT 1`,
            [mintConsensusTimestamp],
        );
        if (!link) return null;

        const tokenId: string | null = link.token_id ?? null;
        const projectKey: string | null = link.project_key ?? null;

        if (!tokenId) {
            return {
                tokenId: null, tokenSupply: null, decimals: null, treasury: null,
                totalMintedAllProjects: 0, totalMintedThisProject: 0, issuanceCount: 0,
                tokenCreatedDate: null, policyTopicId: null, policyName: null,
                issuerDid: null, relatedProjects: [],
            };
        }

        // Independent reads, so they run together rather than one after another —
        // this endpoint is the slow half of the page and there is no dependency
        // between token metadata, mint totals, the Token HCS message and the
        // project list.
        const [[token], [totals], [tokenMessage], relatedProjects] = await Promise.all([
            this.dataSource.query(
                `SELECT "tokenId", "totalSupply"::text AS supply, decimals, treasury
                 FROM token_cache WHERE "tokenId" = $1 LIMIT 1`,
                [tokenId],
            ),
            this.dataSource.query(
                `SELECT
                    COALESCE(SUM(COALESCE(minted_amount, amount)), 0)::text AS all_projects,
                    COALESCE(SUM(COALESCE(minted_amount, amount))
                        FILTER (WHERE project_key = $2), 0)::text           AS this_project,
                    COUNT(*)::int                                           AS issuance_count
                 FROM project_mint_link WHERE token_id = $1`,
                [tokenId, projectKey],
            ),
            this.dataSource.query(
                `SELECT "consensusTimestamp", owner, options,
                        to_char(to_timestamp("consensusTimestamp"::numeric) AT TIME ZONE 'UTC',
                                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_date
                 FROM message
                 WHERE type = 'Token' AND options->>'tokenId' = $1
                 ORDER BY "consensusTimestamp" ASC
                 LIMIT 1`,
                [tokenId],
            ),
            this.dataSource.query(
                `SELECT DISTINCT bv."projectKey" AS "projectId", bv."displayName" AS "projectName"
                 FROM project_mint_link pml
                 JOIN business_view bv
                     ON bv."projectKey" = pml.project_key AND bv."viewType" = 'PROJECT'
                 WHERE pml.token_id = $1
                 ORDER BY bv."displayName" ASC NULLS LAST
                 LIMIT 50`,
                [tokenId],
            ),
        ]);

        // Policy is the one genuinely dependent lookup: it needs the project first.
        let policyTopicId: string | null = null;
        let policyName: string | null = null;
        if (projectKey) {
            const [policy] = await this.dataSource.query(
                `SELECT p."policyTopicId", ip.options->>'name' AS policy_name
                 FROM business_view bv
                 JOIN message m ON m."consensusTimestamp" = bv."sourceTimestamp"
                 JOIN policy p ON p."policyId" = m."policyId"
                 LEFT JOIN LATERAL (
                     SELECT options FROM message
                     WHERE type = 'Instance-Policy' AND action = 'publish-policy'
                       AND "topicId" = p."policyTopicId"
                     ORDER BY "consensusTimestamp" DESC LIMIT 1
                 ) ip ON true
                 WHERE bv."viewType" = 'PROJECT' AND bv."projectKey" = $1
                 LIMIT 1`,
                [projectKey],
            );
            policyTopicId = policy?.policyTopicId ?? null;
            policyName = policy?.policy_name ?? null;
        }

        const decimals = token?.decimals ?? 0;
        const rawSupply = num(token?.supply);

        return {
            tokenId,
            // Fungible supply is stored in the token's smallest unit; scale it so
            // it is comparable with the credit amounts shown beside it.
            tokenSupply: rawSupply === null ? null : rawSupply / 10 ** (decimals ?? 0),
            decimals: decimals ?? null,
            treasury: token?.treasury ?? null,
            totalMintedAllProjects: Number(totals?.all_projects ?? 0),
            totalMintedThisProject: Number(totals?.this_project ?? 0),
            issuanceCount: Number(totals?.issuance_count ?? 0),
            tokenCreatedDate: tokenMessage?.created_date ?? null,
            policyTopicId,
            policyName,
            issuerDid: tokenMessage?.owner ?? null,
            relatedProjects: relatedProjects ?? [],
        };
    }

    async findRelatedIssuances(
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<RelatedIssuancesResult | null> {
        const [link] = await this.dataSource.query(
            `SELECT COALESCE(pml.token_id, m.documents->'credentialSubject'->0->>'tokenId') AS token_id
             FROM message m
             LEFT JOIN project_mint_link pml ON pml.mint_consensus_timestamp = m."consensusTimestamp"
             WHERE m."consensusTimestamp" = $1
               AND m.type = 'VC-Document'
               AND m.documents->'credentialSubject'->0->>'type' LIKE 'MintToken%'
             LIMIT 1`,
            [mintConsensusTimestamp],
        );
        if (!link) return null;
        if (!link.token_id) return { total: 0, issuances: [] };

        const where = `pml.token_id = $1 AND pml.mint_consensus_timestamp <> $2`;

        const [[count], rows]: [Array<{ total: string }>, RelatedIssuanceRow[]] = await Promise.all([
            this.dataSource.query(
                `SELECT COUNT(*)::text AS total FROM project_mint_link pml WHERE ${where}`,
                [link.token_id, mintConsensusTimestamp],
            ),
            this.dataSource.query(
                `SELECT
                    pml.mint_consensus_timestamp AS "mintConsensusTimestamp",
                    pml.amount::text             AS "declaredAmount",
                    pml.minted_amount::text      AS "mintedAmount",
                    pml.mint_match_status        AS "mintMatchStatus",
                    to_char(pml.mint_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "mintDate",
                    bv."projectKey"              AS "projectId",
                    bv."displayName"             AS "projectName"
                 FROM project_mint_link pml
                 LEFT JOIN business_view bv
                     ON bv."projectKey" = pml.project_key AND bv."viewType" = 'PROJECT'
                 WHERE ${where}
                 ORDER BY pml.mint_date DESC NULLS LAST, pml.mint_consensus_timestamp DESC
                 LIMIT $3 OFFSET $4`,
                [link.token_id, mintConsensusTimestamp, limit, (page - 1) * limit],
            ),
        ]);

        return {
            total: parseInt(count?.total ?? '0', 10),
            issuances: rows.map(r => ({
                ...r,
                declaredAmount: num(r.declaredAmount as unknown as string),
                mintedAmount: num(r.mintedAmount as unknown as string),
            })),
        };
    }
}
