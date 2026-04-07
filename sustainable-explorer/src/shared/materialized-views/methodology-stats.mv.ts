/**
 * Materialized view: mv_methodology_stats
 *
 * Aggregates per-methodology counts of projects, issuances, and schemas.
 * Each network lives in its own database, so network is NOT part of the key.
 * Keyed by relatedTopicId (the methodology / policy topic ID).
 *
 * NOTE: project / issuance / schema counts can't be computed cleanly yet
 * because the linkage from policies → projects → credits → schemas isn't
 * fully tracked in `business_view`. The view currently returns 0 for all
 * counts but is structured so it can be populated later without changing
 * its shape (callers and joins remain stable).
 *
 * Refreshed periodically by MvRefreshProcessor.
 */
export const MV_METHODOLOGY_STATS_NAME = 'mv_methodology_stats';

export const MV_METHODOLOGY_STATS_CREATE_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${MV_METHODOLOGY_STATS_NAME} AS
    SELECT
        "relatedTopicId",
        0::bigint AS project_count,
        0::bigint AS issuance_count,
        0::bigint AS schema_count,
        MAX("lastUpdate") AS last_update
    FROM business_view
    WHERE "viewType" = 'METHODOLOGY'
      AND "relatedTopicId" IS NOT NULL
    GROUP BY "relatedTopicId";
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
export const MV_METHODOLOGY_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_METHODOLOGY_STATS_NAME}_related_topic_id
    ON ${MV_METHODOLOGY_STATS_NAME} ("relatedTopicId");
`;
