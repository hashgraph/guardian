import { SCHEMA_DOC_TYPES_SQL, LIFECYCLE_STAGE_CASE } from '@shared/sql/lifecycle-classification.sql';

/**
 * Materialized view: mv_project_lifecycle
 *
 * Pre-computes each project's lifecycle stage (Registered -> Validation ->
 * Monitoring -> Verified -> Issued) and expected issuance year, so the
 * projects list endpoint can filter/sort on them as real columns instead of
 * the Node-side derivation `ProjectResponseDto.fromRow` still uses for the
 * project detail page (full=true) and as a fallback for any list row this
 * MV hasn't caught up to yet (e.g. a project created since the last refresh).
 *
 * The classification itself (SCHEMA_DOC_TYPES_SQL / LIFECYCLE_STAGE_CASE) is
 * shared with PgDashboardRepository's lifecycle-stage aggregates — see
 * src/shared/sql/lifecycle-classification.sql.ts — so there is exactly one
 * definition of "how a project's stage is derived from its linked VCs" for
 * every SQL consumer to drift from the Node computation, not several.
 *
 * expected_issuance_year: for issued projects, the year of the earliest
 * project_mint_link mint; for pipeline projects, the crediting-period-start
 * year, falling back to the vintage year — mirrors the same precedence
 * `ProjectResponseDto.fromRow` already applies.
 *
 * Must be registered AFTER mv_project_stats in materialized-views/index.ts
 * (LEFT JOINs it for the `issued` flag). Refreshed periodically by
 * MvRefreshProcessor, same as every other MV.
 */
export const MV_PROJECT_LIFECYCLE_NAME = 'mv_project_lifecycle';

export const MV_PROJECT_LIFECYCLE_CREATE_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${MV_PROJECT_LIFECYCLE_NAME} AS
    WITH schema_doc_types AS (${SCHEMA_DOC_TYPES_SQL}),
    per_project AS (
        SELECT
            bv."projectKey",
            COALESCE(ps.total_issued, 0) > 0
                OR COALESCE(ps.issuance_count, 0) > 0                   AS issued,
            bool_or(sdt.doc_type = 'verificationReport')                AS has_verification,
            bool_or(sdt.doc_type = 'monitoringReport')                  AS has_monitoring,
            bool_or(sdt.doc_type = 'validationReport')                  AS has_validation,
            MAX(bv."businessData"->>'creditingPeriodStart')             AS crediting_period_start,
            MAX(bv."businessData"->>'vintage')                          AS vintage
        FROM business_view bv
        LEFT JOIN mv_project_stats ps ON ps."projectKey" = bv."projectKey"
        LEFT JOIN LATERAL jsonb_array_elements(
            COALESCE(bv."businessData"->'linkedVcs', '[]'::jsonb)
        ) AS lv ON true
        LEFT JOIN schema_doc_types sdt
            ON sdt.policy_topic_id = bv."businessData"->>'policyTopicId'
           AND sdt.schema_uuid     = lv->>'schemaUuid'
        WHERE bv."viewType" = 'PROJECT' AND bv."projectKey" IS NOT NULL
        GROUP BY bv."projectKey", ps.total_issued, ps.issuance_count
    ),
    first_mint AS (
        SELECT project_key, MIN(mint_date) AS first_mint_date
        FROM project_mint_link
        WHERE mint_date IS NOT NULL
        GROUP BY project_key
    )
    SELECT
        pp."projectKey"                                                 AS "projectKey",
        (${LIFECYCLE_STAGE_CASE})                                       AS lifecycle_stage,
        CASE
            WHEN pp.issued THEN to_char(fm.first_mint_date, 'YYYY')
            ELSE COALESCE(
                substring(pp.crediting_period_start from '[0-9]{4}'),
                substring(pp.vintage from '[0-9]{4}')
            )
        END                                                              AS expected_issuance_year
    FROM per_project pp
    LEFT JOIN first_mint fm ON fm.project_key = pp."projectKey";
`;

// Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
// projectKey is NOT NULL and the GROUP BY key, so it is unique per row.
export const MV_PROJECT_LIFECYCLE_INDEX_SQL = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${MV_PROJECT_LIFECYCLE_NAME}_project_key
    ON ${MV_PROJECT_LIFECYCLE_NAME} ("projectKey");
`;
