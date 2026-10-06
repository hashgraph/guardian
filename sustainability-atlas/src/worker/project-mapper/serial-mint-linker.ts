import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Reconciles what each MintToken VC *declared* against what the ledger actually
 * minted, for both fungible and non-fungible credit tokens.
 *
 * `project_mint_link.amount` comes from the MintToken VC — a statement of
 * intent. Guardian also stamps the mint VP-Document's consensus timestamp
 * on-chain, in one of two carriers depending on token type:
 *
 *   non-fungible → base64 in every minted NFT's metadata
 *                  (nft_cache."metadataTimestamp" holds the decoded value)
 *   fungible     → base64 in the TOKENMINT transaction's memo
 *                  (token_mint_tx.vp_consensus_timestamp holds the decoded value)
 *
 * Both resolve the same way, because the VP's options.relationships array points
 * back at the MintToken VC whose consensusTimestamp is project_mint_link's key:
 *
 *   carrier timestamp        = VP consensusTimestamp
 *   VP options.relationships ∋ mint_consensus_timestamp (MintToken VC)
 *
 * Called from BusinessViewBuilderProcessor right after buildMintProjectLinks.
 * Every statement is set-based and idempotent; the rebuild cycle self-heals
 * arrival-order races (serials or mint transactions synced before the VP is
 * indexed, or vice versa) and keeps counts current as retirements flip
 * nft_cache.deleted.
 *
 * Trust model: the carrier is written by the token's supply-key holder (the
 * Standard Registry). An out-of-band SDK mint could carry arbitrary or
 * duplicate values, so mint_match_status gates every downstream use:
 *   verified  — the amount actually minted equals the MintToken VC amount
 *   mismatch  — both are known but disagree (or the VC declared no amount)
 *   unmatched — VP resolved, but no on-chain mint record carries its timestamp
 *   ambiguous — more than one VP-Document claims this mint VC; never attributed
 *   NULL      — no VP resolved yet
 * Mint records whose timestamp matches no known mint VP are logged as orphans
 * and left unattributed.
 */
export async function linkSerialsToMints(
    dataSource: DataSource,
    logger: Logger,
): Promise<void> {
    // Step 1 — resolve the mint VP per mint VC (unresolved rows only, so
    // late-arriving VP messages are picked up on a later cycle). Exactly one
    // candidate VP → link it; several → 'ambiguous', never attributed.
    await dataSource.query(`
        UPDATE project_mint_link pml
        SET vp_consensus_timestamp = CASE WHEN sub.vp_count = 1 THEN sub.vp_ts END,
            mint_match_status      = CASE WHEN sub.vp_count > 1 THEN 'ambiguous'
                                          ELSE pml.mint_match_status END
        FROM (
            SELECT
                p2.mint_consensus_timestamp,
                MIN(m."consensusTimestamp") AS vp_ts,
                COUNT(*)                    AS vp_count
            FROM project_mint_link p2
            JOIN message m
              ON m.type = 'VP-Document'
             AND jsonb_typeof(m.options->'relationships') = 'array'
             AND m.options->'relationships' @> to_jsonb(p2.mint_consensus_timestamp::text)
            WHERE p2.vp_consensus_timestamp IS NULL
            GROUP BY p2.mint_consensus_timestamp
        ) sub
        WHERE sub.mint_consensus_timestamp = pml.mint_consensus_timestamp
    `);

    // Step 2 — reconcile every mint with a resolved VP against the ledger.
    // Recomputed on every run ('verified' is deliberately not terminal): serials
    // or mint transactions arriving late, retirements flipping deleted, or
    // duplicate carriers appearing later all update the status next cycle.
    //
    // serial_count / serial_retired_count stay non-fungible-only — fungible
    // tokens have no serials — while minted_amount is the unified real figure,
    // always in display units (fungible transaction amounts are recorded in the
    // token's smallest units, so they are scaled down by its decimals here).
    await dataSource.query(`
        UPDATE project_mint_link pml
        SET serial_count             = sub.serial_count,
            serial_retired_count     = sub.serial_retired,
            serial_transferred_count = sub.serial_transferred,
            minted_amount            = sub.minted,
            mint_match_status    = CASE
                WHEN sub.minted IS NULL                                  THEN 'unmatched'
                WHEN pml.amount IS NOT NULL AND sub.minted = pml.amount  THEN 'verified'
                ELSE 'mismatch'
            END
        FROM (
            SELECT
                p2.mint_consensus_timestamp,
                CASE WHEN tc.type = 'NON_FUNGIBLE_UNIQUE' THEN COALESCE(n.cnt, 0)         END AS serial_count,
                CASE WHEN tc.type = 'NON_FUNGIBLE_UNIQUE' THEN COALESCE(n.retired, 0)     END AS serial_retired,
                -- Null, not zero, while any of this mint's serials still have an
                -- unknown holder: "we don't know yet" must not read as "none".
                CASE
                    WHEN tc.type <> 'NON_FUNGIBLE_UNIQUE'   THEN NULL
                    WHEN COALESCE(n.owner_unknown, 0) > 0   THEN NULL
                    ELSE COALESCE(n.transferred, 0)
                END AS serial_transferred,
                CASE
                    WHEN tc.type = 'NON_FUNGIBLE_UNIQUE'
                        THEN NULLIF(COALESCE(n.cnt, 0), 0)::numeric
                    ELSE f.amount_raw / (10::numeric ^ COALESCE(tc.decimals, 0))
                END AS minted
            FROM project_mint_link p2
            JOIN token_cache tc ON tc."tokenId" = p2.token_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int                             AS cnt,
                       (COUNT(*) FILTER (WHERE n2.deleted))::int AS retired,
                       -- Held by someone other than the treasury and still
                       -- live: the only evidence a credit changed hands, since
                       -- transfers leave no Guardian record.
                       (COUNT(*) FILTER (
                           WHERE NOT n2.deleted
                             AND n2."accountId" IS NOT NULL
                             AND tc.treasury IS NOT NULL
                             AND n2."accountId" <> tc.treasury
                       ))::int                                   AS transferred,
                       -- Serials whose holder hasn't been synced yet. Ownership
                       -- arrives a page at a time, so a partially-synced mint
                       -- would otherwise report a confident-looking count that
                       -- is really just "how far the re-sync has got".
                       (COUNT(*) FILTER (
                           WHERE NOT n2.deleted AND n2."accountId" IS NULL
                       ))::int                                   AS owner_unknown
                FROM nft_cache n2
                WHERE n2."tokenId"           = p2.token_id
                  AND n2."metadataTimestamp" = p2.vp_consensus_timestamp
            ) n ON tc.type = 'NON_FUNGIBLE_UNIQUE'
            LEFT JOIN LATERAL (
                SELECT SUM(t.amount_raw) AS amount_raw
                FROM token_mint_tx t
                WHERE t.token_id               = p2.token_id
                  AND t.vp_consensus_timestamp = p2.vp_consensus_timestamp
            ) f ON tc.type <> 'NON_FUNGIBLE_UNIQUE'
            WHERE p2.vp_consensus_timestamp IS NOT NULL
        ) sub
        WHERE sub.mint_consensus_timestamp = pml.mint_consensus_timestamp
    `);

    // Step 3 — orphan detection: on-chain mint records whose carried timestamp
    // matches no known mint VP for that token. Flagged, never attributed.
    const orphans: Array<{ token_id: string; serials: string; mint_txs: string }> = await dataSource.query(`
        SELECT
            token_id,
            SUM(serials)::text  AS serials,
            SUM(mint_txs)::text AS mint_txs
        FROM (
            SELECT n."tokenId" AS token_id, COUNT(*) AS serials, 0 AS mint_txs
            FROM nft_cache n
            WHERE n."metadataTimestamp" IS NOT NULL
              AND EXISTS (SELECT 1 FROM project_mint_link p WHERE p.token_id = n."tokenId")
              AND NOT EXISTS (
                  SELECT 1 FROM project_mint_link p
                  WHERE p.token_id = n."tokenId"
                    AND p.vp_consensus_timestamp = n."metadataTimestamp"
              )
            GROUP BY n."tokenId"
            UNION ALL
            SELECT t.token_id, 0 AS serials, COUNT(*) AS mint_txs
            FROM token_mint_tx t
            WHERE t.vp_consensus_timestamp IS NOT NULL
              AND EXISTS (SELECT 1 FROM project_mint_link p WHERE p.token_id = t.token_id)
              AND NOT EXISTS (
                  SELECT 1 FROM project_mint_link p
                  WHERE p.token_id = t.token_id
                    AND p.vp_consensus_timestamp = t.vp_consensus_timestamp
              )
            GROUP BY t.token_id
        ) o
        GROUP BY token_id
    `);

    for (const o of orphans) {
        const parts = [
            o.serials !== '0' ? `${o.serials} serial(s)` : null,
            o.mint_txs !== '0' ? `${o.mint_txs} mint transaction(s)` : null,
        ].filter(Boolean).join(' and ');
        logger.warn(
            `SerialMintLinker: token ${o.token_id} has ${parts} whose mint VP ` +
            `timestamp matches no known mint — left unattributed`,
        );
    }

    const tally: Array<{ status: string | null; cnt: string }> = await dataSource.query(`
        SELECT mint_match_status AS status, COUNT(*) AS cnt
        FROM project_mint_link
        GROUP BY mint_match_status
    `);
    const summary = tally
        .map((t) => `${t.status ?? 'unlinked'}=${t.cnt}`)
        .join(', ');
    logger.log(`SerialMintLinker: ${summary || 'no mint links yet'}`);
}
