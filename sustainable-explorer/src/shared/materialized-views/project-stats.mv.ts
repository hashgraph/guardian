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
 * findById path still computes these live for a single row, so it stays exact.
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
        -- issuance_count + total_issued, straight off project_mint_link.
        SELECT
            pml.project_key,
            COUNT(DISTINCT pml.token_id) FILTER (WHERE pml.token_id IS NOT NULL)::int AS issuance_count,
            COALESCE(SUM(pml.amount), 0)::bigint AS total_issued
        FROM project_mint_link pml
        GROUP BY pml.project_key
    ),
    -- Distinct NFT tokens per project. Only NON_FUNGIBLE_UNIQUE tokens can have
    -- retired (deleted) serials, so non-NFT tokens are filtered out here.
    project_nft_tokens AS (
        SELECT DISTINCT pml.project_key, pml.token_id
        FROM project_mint_link pml
        JOIN token_cache tc
            ON tc."tokenId" = pml.token_id
           AND tc.type = 'NON_FUNGIBLE_UNIQUE'
        WHERE pml.token_id IS NOT NULL
    ),
    -- Retired serial counts per token (one pass over nft_cache).
    nft_retired AS (
        SELECT "tokenId", COUNT(*) FILTER (WHERE deleted = true)::bigint AS retired_count
        FROM nft_cache
        GROUP BY "tokenId"
    ),
    retired AS (
        SELECT
            pnt.project_key,
            COALESCE(SUM(nr.retired_count), 0)::bigint AS total_retired
        FROM project_nft_tokens pnt
        LEFT JOIN nft_retired nr ON nr."tokenId" = pnt.token_id
        GROUP BY pnt.project_key
    )
    SELECT
        i.project_key                        AS "projectKey",
        i.issuance_count                     AS issuance_count,
        i.total_issued                       AS total_issued,
        COALESCE(r.total_retired, 0)::bigint AS total_retired
    FROM issued i
    LEFT JOIN retired r ON r.project_key = i.project_key;
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
// project_key is NOT NULL and the GROUP BY key, so it is unique per row.
export const MV_PROJECT_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_PROJECT_STATS_NAME}_project_key
    ON ${MV_PROJECT_STATS_NAME} ("projectKey");
`;
