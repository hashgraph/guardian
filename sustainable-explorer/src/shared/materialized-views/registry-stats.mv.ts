/**
 * Materialized view: mv_registry_stats
 *
 * Aggregates per-registry counts of policies, projects, and issuances.
 * Each network lives in its own database, so network is NOT part of the key.
 * Keyed by registryDid.
 *
 * Refreshed periodically by MvRefreshProcessor.
 */
export const MV_REGISTRY_STATS_NAME = 'mv_registry_stats';

export const MV_REGISTRY_STATS_CREATE_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${MV_REGISTRY_STATS_NAME} AS
    SELECT
        bv."registryDid",
        COUNT(*) FILTER (WHERE bv."viewType" = 'METHODOLOGY') AS policy_count,
        COUNT(*) FILTER (WHERE bv."viewType" = 'PROJECT')     AS project_count,
        COUNT(*) FILTER (WHERE bv."viewType" = 'CREDIT')      AS issuance_count,
        0::bigint AS user_count,
        MAX(bv."lastUpdate") AS last_update,
        -- Decode-status counts: grouped per registry across all METHODOLOGY rows.
        -- methodology_decode_success_count = number of methodologies under this registry
        --   whose ZIP was decoded successfully.
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND pds.status = 'success'
        ) AS methodology_decode_success_count,
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND pds.status = 'failed'
        ) AS methodology_decode_failed_count,
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND pds.status = 'pending'
        ) AS methodology_decode_pending_count,
        -- methodologies with no policy_decode_status row yet (never attempted)
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND pds.status IS NULL
        ) AS methodology_decode_unknown_count
    FROM business_view bv
    LEFT JOIN policy_decode_status pds
           ON pds."policyTopicId" = bv."businessData"->>'topicId'
          AND bv."viewType" = 'METHODOLOGY'
    WHERE bv."registryDid" IS NOT NULL
      AND bv."viewType" IN ('METHODOLOGY', 'PROJECT', 'CREDIT')
    GROUP BY bv."registryDid";
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
export const MV_REGISTRY_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_REGISTRY_STATS_NAME}_registry_did
    ON ${MV_REGISTRY_STATS_NAME} ("registryDid");
`;
