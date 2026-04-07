import { FieldSchema } from '../query-builder';

/**
 * Field schema for the Registries endpoint.
 *
 * Adding a new filter only requires adding an entry here. The
 * PgRegistryRepository's QueryBuilder will pick it up automatically.
 *
 * Notes:
 *   - `bv` is the alias used for `business_view` in the repository's queries.
 *   - jsonb fields are extracted via `->'options'->>'key'` paths.
 *   - Stat fields like `policy_count` come from the joined `mv_registry_stats`
 *     materialized view (alias `s`).
 */
export const REGISTRY_FIELD_SCHEMA: FieldSchema = {
    // ── Plain columns ───────────────────────────────────────────────────
    did: {
        sql: 'bv."registryDid"',
        filter: 'eq',
        sortable: true,
    },
    id: {
        sql: 'bv."relatedTopicId"',
        filter: 'ilike',
        sortable: true,
    },
    relatedTopicId: {
        sql: 'bv."relatedTopicId"',
        sortable: true,
    },
    displayName: {
        sql: 'bv."displayName"',
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
    tags: {
        sql: `bv."businessData"->'options'->>'tags'`,
        filter: 'ilike',
        sortable: true,
    },
    geography: {
        sql: `bv."businessData"->'options'->>'geography'`,
        filter: 'ilike',
        sortable: true,
    },
    law: {
        sql: `bv."businessData"->'options'->>'law'`,
        filter: 'ilike',
        sortable: true,
    },

    // ── Joined materialized view columns ────────────────────────────────
    policies: {
        sql: 's.policy_count',
        sortable: true,
    },
    projects: {
        sql: 's.project_count',
        sortable: true,
    },
    issuances: {
        sql: 's.issuance_count',
        sortable: true,
    },
};
