import { FieldSchema } from '../query-builder';

/**
 * Field schema for the Methodologies endpoint.
 *
 * Adding a new filter only requires adding an entry here. The
 * PgMethodologyRepository's QueryBuilder will pick it up automatically.
 *
 * Notes:
 *   - `bv` is the alias used for `business_view` in the repository's queries
 *     (findAll/findAllForExport read it off PgMethodologyRepository's
 *     METHODOLOGY_CANDIDATE_CTE, which flattens the mv_methodology_stats
 *     join under the same `bv` alias — there is no separate `canon`/`reg`
 *     alias in scope).
 *   - jsonb fields are extracted via `->'options'->>'key'` paths.
 *   - Stat fields like `project_count` come from mv_methodology_stats;
 *     `registry_name` is the MV's own precomputed publishing-registry name.
 */
export const METHODOLOGY_FIELD_SCHEMA: FieldSchema = {
    // ── Plain columns ───────────────────────────────────────────────────
    name: {
        sql: 'bv."displayName"',
        filter: 'ilike',
        sortable: true,
    },
    id: {
        sql: 'bv."relatedTopicId"',
        filter: 'ilike',
        sortable: true,
    },
    registryDid: {
        sql: 'bv."registryDid"',
        filter: 'eq',
        sortable: true,
    },
    registryName: {
        sql: 'bv.registry_name',
        filter: 'ilike',
        sortable: true,
    },
    sourceTimestamp: {
        sql: 'bv."sourceTimestamp"',
        sortable: true,
    },
    createdAt: {
        sql: 'bv."createdAt"',
        sortable: true,
    },
    updatedAt: {
        sql: 'bv."updatedAt"',
        sortable: true,
    },

    // ── jsonb-extracted fields ──────────────────────────────────────────
    description: {
        sql: `bv."businessData"->>'description'`,
        filter: 'ilike',
        sortable: true,
    },
    version: {
        sql: `bv."businessData"->'options'->>'version'`,
        filter: 'ilike',
        sortable: true,
    },
    policyTopicId: {
        sql: `bv."businessData"->>'topicId'`,
        filter: 'eq',
        sortable: true,
    },

    // ── Joined materialized view columns ────────────────────────────────
    // Sourced from mv_methodology_stats, but read off the candidate CTE's
    // `bv` alias (see PgMethodologyRepository.METHODOLOGY_CANDIDATE_CTE) —
    // there is no separate `canon` alias in scope in findAll's rowsSql/countSql.
    projects: {
        sql: 'bv.project_count',
        sortable: true,
    },
    issuances: {
        sql: 'bv.issuance_count',
        sortable: true,
    },
    schemas: {
        sql: 'bv.schema_count',
        sortable: true,
    },
};
