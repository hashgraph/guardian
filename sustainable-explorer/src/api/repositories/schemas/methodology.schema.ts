import { FieldSchema } from '../query-builder';

/**
 * Field schema for the Methodologies endpoint.
 *
 * Adding a new filter only requires adding an entry here. The
 * PgMethodologyRepository's QueryBuilder will pick it up automatically.
 *
 * Notes:
 *   - `bv` is the alias used for `business_view` in the repository's queries.
 *   - jsonb fields are extracted via `->'options'->>'key'` paths.
 *   - Stat fields like `project_count` come from the joined
 *     `mv_methodology_stats` materialized view (alias `s`).
 *   - `reg.registry_name` comes from a LATERAL join in the repository
 *     that resolves the publishing registry's display name.
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
        sql: 'reg.registry_name',
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
    status: {
        sql: `bv."businessData"->>'status'`,
        filter: 'eq',
        sortable: true,
    },
    version: {
        sql: `bv."businessData"->'options'->>'version'`,
        filter: 'ilike',
        sortable: true,
    },

    // ── Joined materialized view columns ────────────────────────────────
    projects: {
        sql: 's.project_count',
        sortable: true,
    },
    issuances: {
        sql: 's.issuance_count',
        sortable: true,
    },
    schemas: {
        sql: 's.schema_count',
        sortable: true,
    },
};
