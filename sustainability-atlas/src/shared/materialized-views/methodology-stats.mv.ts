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
    ),
    -- The canonical (newest) business_view row per topic. Precomputed here so
    -- the list endpoints can test canonicality with an equality check against a
    -- column they already join, instead of deduplicating every METHODOLOGY row
    -- on each request.
    canonical AS (
        SELECT DISTINCT ON ("relatedTopicId") "relatedTopicId", id
        FROM business_view
        WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NOT NULL
        ORDER BY "relatedTopicId", "sourceTimestamp"::numeric DESC, id DESC
    )
    SELECT
        mb."relatedTopicId",
        c.id AS canonical_id,
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
            SELECT COUNT(*)
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
            SELECT COUNT(*)
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
        p."policyMapping"->'sectoralScopes'             AS sectoral_scopes,
        p."policyMapping"->'emissionReductionApproach'  AS emission_reduction_approach,
        reg.registry_name,
        COALESCE(lc.total_issued, 0)::bigint  AS total_issued,
        COALESCE(lc.total_retired, 0)::bigint AS total_retired,
        mb.last_update
    FROM methodology_base mb
    JOIN canonical c ON c."relatedTopicId" = mb."relatedTopicId"
    LEFT JOIN LATERAL (
        -- A single policyTopicId can have multiple version rows. Prefer the
        -- decoded one, then the most recently updated, so the MV stays 1:1 with
        -- the unique index. Selection rule matches the list endpoint's
        -- effective-decode-status resolution.
        SELECT "decodeStatus", attempts, "lastAttemptAt", "policyMapping"
        FROM policy
        WHERE "policyTopicId" = mb.policy_topic_id
        ORDER BY ("decodeStatus" = 'decoded') DESC NULLS LAST,
                 "updatedAt" DESC NULLS LAST
        LIMIT 1
    ) p ON TRUE
    -- Publishing registry's display name, resolved from the canonical
    -- methodology row's registryDid.
    LEFT JOIN LATERAL (
        SELECT r."displayName" AS registry_name
        FROM business_view bvc
        LEFT JOIN LATERAL (
            SELECT "displayName"
            FROM business_view
            WHERE "viewType" = 'REGISTRY' AND "registryDid" = bvc."registryDid"
            ORDER BY "createdAt" DESC NULLS LAST
            LIMIT 1
        ) r ON TRUE
        WHERE bvc.id = c.id
    ) reg ON TRUE
    -- Lifecycle volumes summed from the per-project stats view over the
    -- projects belonging to this methodology instance.
    LEFT JOIN LATERAL (
        SELECT SUM(mps.total_issued)  AS total_issued,
               SUM(mps.total_retired) AS total_retired
        FROM business_view proj
        JOIN mv_project_stats mps ON mps."projectKey" = proj."projectKey"
        WHERE proj."viewType" = 'PROJECT'
          AND proj."businessData"->>'instanceTopicId' = mb."relatedTopicId"
    ) lc ON TRUE;
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
export const MV_METHODOLOGY_STATS_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_METHODOLOGY_STATS_NAME}_related_topic_id
    ON ${MV_METHODOLOGY_STATS_NAME} ("relatedTopicId");
    CREATE INDEX IF NOT EXISTS idx_${MV_METHODOLOGY_STATS_NAME}_canonical_id
    ON ${MV_METHODOLOGY_STATS_NAME} (canonical_id);
`;
