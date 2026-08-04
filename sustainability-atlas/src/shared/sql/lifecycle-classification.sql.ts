/**
 * Shared SQL fragments for deriving a project's lifecycle stage
 * (Registered -> Validation -> Monitoring -> Verified -> Issued) from the
 * policy's decoded VC-schema classifications. Single source of truth for
 * every SQL consumer that needs this — currently PgDashboardRepository's
 * lifecycle-stage aggregates and mv_project_lifecycle — so there is exactly
 * one place this logic can drift from `ProjectResponseDto.fromRow`'s
 * Node-side derivation, not several independently-maintained copies.
 */

/**
 * Document type per (policy topic, bare schema UUID).
 *
 * policyMapping carries full IRIs of the form `#<uuid>&<version>` while a
 * project's linkedVcs entries carry only the uuid, so the IRI is trimmed to
 * make the two joinable.
 */
export const SCHEMA_DOC_TYPES_SQL = `
    SELECT DISTINCT
        p."policyTopicId"                                    AS policy_topic_id,
        split_part(ltrim(e->>'schemaIri', '#'), '&', 1)      AS schema_uuid,
        e->>'docType'                                        AS doc_type
    FROM policy p,
         LATERAL jsonb_each(COALESCE(p."policyMapping", '{}'::jsonb)) AS kv(k, v),
         LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(kv.v) = 'array' THEN kv.v ELSE '[]'::jsonb END
         ) AS e
    WHERE p."decodeStatus" = 'decoded'
      AND e ? 'schemaIri'
      AND e ? 'docType'
`;

/**
 * Resolves a per-project row's boolean flags (`issued`, `has_verification`,
 * `has_monitoring`, `has_validation`) into a lifecycle stage label. Expects
 * those four columns to be in scope wherever this is interpolated.
 */
export const LIFECYCLE_STAGE_CASE = `
    CASE
        WHEN issued           THEN 'Issued'
        WHEN has_verification THEN 'Verified'
        WHEN has_monitoring   THEN 'Monitoring'
        WHEN has_validation   THEN 'Validation'
        ELSE 'Registered'
    END
`;
