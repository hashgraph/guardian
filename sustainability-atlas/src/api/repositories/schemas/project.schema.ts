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
        // REGISTRY_NAME_JOIN is unconditionally present in the rows query
        // (only the count query's join is conditional on the `registry`
        // filter being set, which sorting doesn't touch), so this is free.
        sortable: true,
    },
    /**
     * Exact-match scope by publishing registry DID. Unlike `registry` (a name
     * ILIKE, which collides when two registries share a display name) this is
     * unambiguous, and it filters a plain indexed column on business_view
     * instead of the joined registry-name derived table — so it never forces
     * REGISTRY_NAME_JOIN into the count query.
     */
    registryDid: {
        sql: `bv."registryDid"`,
        filter: 'eq',
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
    // Separate from `vintage` (exact-match string, kept as-is for backward
    // compat) — a numeric-cast field solely for the range filter, matching
    // the "credits" field's existing cast-in-sql precedent below.
    vintageYear: {
        sql: `NULLIF(bv."businessData"->>'vintage','')::int`,
        filter: 'between',
    },
    status: {
        sql: `bv."businessData"->>'status'`,
        filter: 'eq',
        sortable: false,
    },
    sector: {
        sql: `bv."businessData"->>'sector'`,
        filter: 'ilike',
        sortable: true,
    },
    sectoralScope: {
        sql: `bv."businessData"->>'sectoralScope'`,
        filter: 'ilike',
        sortable: false,
    },
    policyTopicId: {
        sql: `bv."businessData"->>'policyTopicId'`,
        filter: 'eq',
        sortable: false,
    },
    instanceTopicId: {
        sql: `bv."businessData"->>'instanceTopicId'`,
        filter: 'eq',
        sortable: false,
    },
    credits: {
        sql: `(bv."businessData"->>'credits')::float`,
        filter: 'eq',
        sortable: true,
    },
    // Sort-only — backed by PROJECT_STATS_JOIN's `ps` alias (mv_project_stats),
    // already unconditionally joined in findAll's rows query.
    issuanceCount: {
        sql: `COALESCE(ps.issuance_count, 0)`,
        sortable: true,
    },
    sdgs: {
        sql: `bv."businessData"->'sdgs'`,
        filter: 'contains-any',
    },
    // Backed by mv_project_lifecycle's `lc` alias — see PROJECT_LIFECYCLE_JOIN
    // in pg-project.repository.ts. `isPipeline` has no own column (it's
    // `lifecycle_stage != 'Issued'`) and is handled as a one-off clause in
    // the repository instead.
    lifecycleStage: {
        sql: `lc.lifecycle_stage`,
        filter: 'eq',
        sortable: true,
    },
    expectedIssuanceYear: {
        sql: `NULLIF(lc.expected_issuance_year, '')::int`,
        filter: 'between',
        sortable: true,
    },

    // ── Plain columns ───────────────────────────────────────────────────
    sourceTimestamp: {
        sql: 'bv."sourceTimestamp"',
        filter: 'in',
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
