/**
 * Materialized view: mv_methodology_stats
 *
 * Aggregates per-methodology counts of projects, issuances, and schemas.
 * Each network lives in its own database, so network is NOT part of the key.
 * Keyed by relatedTopicId (the methodology / policy topic ID).
 *
 * Projects link to their methodology via businessData->>'policyTopicId'.
 *
 * Refreshed periodically by MvRefreshProcessor.
 */
export const MV_METHODOLOGY_STATS_NAME = 'mv_methodology_stats';

export const MV_METHODOLOGY_STATS_CREATE_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${MV_METHODOLOGY_STATS_NAME} AS
    WITH methodology_base AS (
        SELECT
            "relatedTopicId",
            MAX("businessData"->>'topicId') AS policy_topic_id,
            MAX("lastUpdate") AS last_update
        FROM business_view
        WHERE "viewType" = 'METHODOLOGY'
          AND "relatedTopicId" IS NOT NULL
        GROUP BY "relatedTopicId"
    )
    SELECT
        mb."relatedTopicId",
        COALESCE((
            SELECT COUNT(*)
            FROM business_view p
            WHERE p."viewType" = 'PROJECT'
              AND p."businessData"->>'policyTopicId' = mb.policy_topic_id
        ), 0)::bigint AS project_count,
        COALESCE((
            SELECT COUNT(*)
            FROM business_view p
            WHERE p."viewType" = 'PROJECT'
              AND p."businessData"->>'instanceTopicId' = mb."relatedTopicId"
        ), 0)::bigint AS instance_project_count,
        COALESCE((
            SELECT COUNT(DISTINCT pml.token_id)
            FROM project_mint_link pml
            JOIN business_view proj
                ON proj."projectKey" = pml.project_key
               AND proj."viewType" = 'PROJECT'
               AND (
                   proj."businessData"->>'instanceTopicId' = mb."relatedTopicId"
                   OR proj."businessData"->>'policyTopicId' = mb.policy_topic_id
               )
            WHERE pml.token_id IS NOT NULL
        ), 0)::bigint AS issuance_count,
        COALESCE((
            SELECT COUNT(DISTINCT pml.token_id)
            FROM project_mint_link pml
            JOIN business_view proj
                ON proj."projectKey" = pml.project_key
               AND proj."viewType" = 'PROJECT'
               AND proj."businessData"->>'instanceTopicId' = mb."relatedTopicId"
            WHERE pml.token_id IS NOT NULL
        ), 0)::bigint AS instance_issuance_count,
        COALESCE((
            SELECT COUNT(DISTINCT entry_iri)
            FROM policy p2,
                 LATERAL jsonb_object_keys(COALESCE(p2."rawSchemaJson", '{}'::jsonb)) AS entry_iri
            WHERE p2."policyTopicId" = mb.policy_topic_id
              AND p2."decodeStatus" = 'decoded'
        ), 0)::bigint AS schema_count,
        p."decodeStatus" AS decode_status,
        p.attempts       AS decode_attempts,
        p."lastAttemptAt" AS decode_last_attempt_at,
        mb.last_update
    FROM methodology_base mb
    LEFT JOIN LATERAL (
        -- A single policyTopicId can have multiple version rows. Pick the most
        -- recently updated decoded one so the MV stays 1:1 with the unique index.
        SELECT "decodeStatus", attempts, "lastAttemptAt"
        FROM policy
        WHERE "policyTopicId" = mb.policy_topic_id
          AND "decodeStatus" = 'decoded'
        ORDER BY "updatedAt" DESC NULLS LAST
        LIMIT 1
    ) p ON TRUE;
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
export const MV_METHODOLOGY_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_METHODOLOGY_STATS_NAME}_related_topic_id
    ON ${MV_METHODOLOGY_STATS_NAME} ("relatedTopicId");
`;
