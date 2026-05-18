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
              AND p."decodeStatus" = 'decoded'
        ) AS methodology_decode_success_count,
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND p."decodeStatus" = 'failed'
        ) AS methodology_decode_failed_count,
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND p."decodeStatus" = 'pending'
        ) AS methodology_decode_pending_count,
        -- methodologies with no policy row yet (never attempted)
        COUNT(*) FILTER (
            WHERE bv."viewType" = 'METHODOLOGY'
              AND p."decodeStatus" IS NULL
        ) AS methodology_decode_unknown_count
    FROM business_view bv
    -- LATERAL join with LIMIT 1 so a topic with multiple policy versions
    -- contributes a single row per methodology. Without this the plain join
    -- multiplied each METHODOLOGY by its policy-version count, inflating
    -- policy_count and the decode-status buckets (e.g. Gold Standard showed
    -- 4 methodologies on the registry card vs 2 on the methodologies page).
    -- Selection rule mirrors PgPolicySchemaRepository.findDecoded: prefer
    -- the decoded row, then the most recently updated one.
    LEFT JOIN LATERAL (
        SELECT pp."decodeStatus"
        FROM policy pp
        WHERE pp."policyTopicId" = bv."businessData"->>'topicId'
        ORDER BY (pp."decodeStatus" = 'decoded') DESC NULLS LAST,
                 pp."updatedAt" DESC NULLS LAST
        LIMIT 1
    ) p ON bv."viewType" = 'METHODOLOGY'
    WHERE bv."registryDid" IS NOT NULL
      AND bv."viewType" IN ('METHODOLOGY', 'PROJECT', 'CREDIT')
    GROUP BY bv."registryDid";
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
export const MV_REGISTRY_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_REGISTRY_STATS_NAME}_registry_did
    ON ${MV_REGISTRY_STATS_NAME} ("registryDid");
`;
