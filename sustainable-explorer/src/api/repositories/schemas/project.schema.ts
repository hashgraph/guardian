import { FieldSchema } from '../query-builder';

/**
 * Field schema for the Projects endpoint.
 *
 * Adding a new filter only requires adding an entry here. The
 * PgProjectRepository's QueryBuilder will pick it up automatically.
 *
 * Notes:
 *   - `bv` is the alias used for `business_view` in the repository's queries.
 *   - All project-specific fields are stored in `businessData` jsonb.
 *   - `reg.registry_name` comes from a LATERAL join in the repository
 *     that resolves the publishing registry's display name.
 */
export const PROJECT_FIELD_SCHEMA: FieldSchema = {
    name: {
        sql: `bv."businessData"->>'name'`,
        filter: 'ilike',
        sortable: true,
    },
    country: {
        sql: `bv."businessData"->>'country'`,
        filter: 'ilike',
        sortable: true,
    },
    methodology: {
        sql: `bv."businessData"->>'methodology'`,
        filter: 'ilike',
        sortable: true,
    },
    registry: {
        sql: `reg.registry_name`,
        filter: 'ilike',
        sortable: false,
    },
    developer: {
        sql: `bv."businessData"->>'developer'`,
        filter: 'ilike',
        sortable: true,
    },
    vintage: {
        sql: `bv."businessData"->>'vintage'`,
        filter: 'eq',
        sortable: true,
    },
    status: {
        sql: `bv."businessData"->>'status'`,
        filter: 'eq',
        sortable: false,
    },
    credits: {
        sql: `(bv."businessData"->>'credits')::float`,
        filter: 'eq',
        sortable: true,
    },

    // ── Plain columns ───────────────────────────────────────────────────
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
};
