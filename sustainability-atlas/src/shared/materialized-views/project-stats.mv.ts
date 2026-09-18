/**
 * Materialized view: mv_project_stats
 *
 * Pre-computes the per-project lifecycle aggregates that the projects list
 * endpoint previously computed live via three LATERAL subqueries per row
 * (issuance count, total issued, total retired). Keyed by projectKey
 * (business_view.projectKey / credentialSubject.id), which matches
 * project_mint_link.project_key.
 *
 * Mirrors the live aggregation that used to live in PgProjectRepository.findAll
 * (ISSUANCE_COUNT_JOIN / LIFECYCLE_ISSUED_JOIN / LIFECYCLE_RETIRED_JOIN). The
 * findById path does NOT join this MV — it computes all of these live for the
 * single row, and its issuanceCount query is written to mirror the `issued` CTE
 * below exactly (same table, same FILTER, no join to `message`). Any change to
 * the aggregation semantics here has to be mirrored there, or the projects list
 * and the project detail page will report different numbers for the same project.
 *
 * One deliberate exception: for a project with NO project_mint_link rows whose
 * credits were resolved from token_cache instead, findById falls back to the
 * number of linked credit rows so the detail page can't render the nonsensical
 * "N issued, 0 issuances". This MV has no row for such a project at all, so the
 * list page reports 0 there — a known, accepted divergence.
 *
 * Projects with no mints are intentionally absent here; the row query
 * LEFT JOINs this MV and COALESCEs the missing columns to 0, matching the old
 * live behaviour. Each network lives in its own database, so network is NOT
 * part of the key.
 *
 * Refreshed periodically by MvRefreshProcessor.
 */
export const MV_PROJECT_STATS_NAME = 'mv_project_stats';

export const MV_PROJECT_STATS_CREATE_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${MV_PROJECT_STATS_NAME} AS
    WITH issued AS (
        -- issuance_count + volumes, straight off project_mint_link.
        --
        -- total_issued reports what the ledger actually minted (minted_amount,
        -- reconciled from NFT serials or fungible mint transactions by
        -- serial-mint-linker), falling back to the MintToken VC's declared
        -- amount while a mint is still unreconciled — so a project never drops
        -- to zero mid-sync. The declared figure is kept alongside it because the
        -- two genuinely differ: mints have been observed declaring 48 credits
        -- while minting 8.
        SELECT
            pml.project_key,
            COUNT(*) FILTER (WHERE pml.token_id IS NOT NULL)::int AS issuance_count,
            COALESCE(SUM(COALESCE(pml.minted_amount, pml.amount)), 0)::numeric AS total_issued,
            COALESCE(SUM(pml.amount), 0)::numeric AS total_declared,
            COUNT(*) FILTER (WHERE pml.mint_match_status = 'mismatch')::int AS mismatch_count
        FROM project_mint_link pml
        GROUP BY pml.project_key
    ),
    -- Retirement is counted only for credits that provably came from a Guardian
    -- mint. Two kinds of evidence qualify.
    --
    -- First: a retired NFT serial whose metadata carries the mint VP's
    -- timestamp, so it is attributed to the exact mint event (and therefore
    -- vintage) it came from. serial_retired_count holds that per-mint figure,
    -- and because each mint link belongs to exactly one project it cannot be
    -- double-counted the way the previous token-level rollup was — that version
    -- charged *every* project sharing a token with the whole of that token's
    -- retirements.
    mint_retired AS (
        SELECT pml.project_key,
               COALESCE(SUM(pml.serial_retired_count), 0)::numeric AS retired
        FROM project_mint_link pml
        WHERE pml.serial_retired_count IS NOT NULL
        GROUP BY pml.project_key
    ),
    -- Second: fungible retirement, documented by Guardian's RETIRE contract
    -- events. Token-level by nature — fungible units are interchangeable, so
    -- there is no honest way to say which mint event a retired unit came from —
    -- but the contract event is proof the retirement happened under Guardian.
    -- Amounts are in the token's smallest units, hence the decimals scaling.
    fungible_retired AS (
        SELECT tre.token_id,
               (SUM(tre.amount) / (10::numeric ^ COALESCE(tc.decimals, 0))) AS retired
        FROM token_retire_event tre
        JOIN token_cache tc
            ON tc."tokenId" = tre.token_id AND tc.type = 'FUNGIBLE_COMMON'
        WHERE tre.amount IS NOT NULL
        GROUP BY tre.token_id, tc.decimals
    ),
    project_tokens AS (
        SELECT DISTINCT pml.project_key, pml.token_id
        FROM project_mint_link pml
        WHERE pml.token_id IS NOT NULL
    ),
    -- Tokens minted by exactly one project. The token-level remainder below is
    -- only charged to these: when several projects mint the same token there is
    -- no way to say whose credits the unattributable residue was, and counting
    -- it for each of them would report one retirement several times.
    sole_project_tokens AS (
        SELECT pml.token_id
        FROM project_mint_link pml
        WHERE pml.token_id IS NOT NULL
        GROUP BY pml.token_id
        HAVING COUNT(DISTINCT pml.project_key) = 1
    ),
    -- The token-level remainder: documented fungible retirement. Not
    -- per-vintage, but proven.
    token_level_retired AS (
        SELECT pt.project_key,
               COALESCE(SUM(f.retired), 0)::numeric AS retired
        FROM project_tokens pt
        JOIN sole_project_tokens spt ON spt.token_id = pt.token_id
        LEFT JOIN fungible_retired f ON f.token_id = pt.token_id
        GROUP BY pt.project_key
    ),
    retired AS (
        SELECT pt.project_key,
               (COALESCE(mr.retired, 0) + COALESCE(tl.retired, 0))::numeric AS total_retired
        FROM (SELECT DISTINCT project_key FROM project_tokens) pt
        LEFT JOIN mint_retired mr       ON mr.project_key = pt.project_key
        LEFT JOIN token_level_retired tl ON tl.project_key = pt.project_key
    )
    SELECT
        i.project_key                        AS "projectKey",
        i.issuance_count                     AS issuance_count,
        i.total_issued                       AS total_issued,
        i.total_declared                     AS total_declared,
        i.mismatch_count                     AS mismatch_count,
        COALESCE(r.total_retired, 0)::numeric AS total_retired
    FROM issued i
    LEFT JOIN retired r ON r.project_key = i.project_key;
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
// project_key is NOT NULL and the GROUP BY key, so it is unique per row.
export const MV_PROJECT_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_PROJECT_STATS_NAME}_project_key
    ON ${MV_PROJECT_STATS_NAME} ("projectKey");
`;
