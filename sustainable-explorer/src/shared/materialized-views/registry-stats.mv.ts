/**
 * Materialized view: mv_registry_stats
 *
 * Aggregates per-registry counts of policies, projects, and issuances,
 * scoped by network (mainnet/testnet/previewnet).
 * Keyed by (network, registryDid).
 *
 * Refreshed periodically by MvRefreshProcessor.
 */
export const MV_REGISTRY_STATS_NAME = 'mv_registry_stats';

export const MV_REGISTRY_STATS_CREATE_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${MV_REGISTRY_STATS_NAME} AS
    SELECT
        network,
        "registryDid",
        COUNT(*) FILTER (WHERE "viewType" = 'METHODOLOGY') AS policy_count,
        COUNT(*) FILTER (WHERE "viewType" = 'PROJECT') AS project_count,
        COUNT(*) FILTER (WHERE "viewType" = 'CREDIT') AS issuance_count,
        0::bigint AS user_count,
        MAX("lastUpdate") AS last_update
    FROM business_view
    WHERE "registryDid" IS NOT NULL
      AND "viewType" IN ('METHODOLOGY', 'PROJECT', 'CREDIT')
    GROUP BY network, "registryDid";
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
export const MV_REGISTRY_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_REGISTRY_STATS_NAME}_network_did
    ON ${MV_REGISTRY_STATS_NAME} (network, "registryDid");
`;
