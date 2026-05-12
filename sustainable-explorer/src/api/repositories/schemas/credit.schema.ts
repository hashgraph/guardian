import { FieldSchema } from '../query-builder';

/**
 * Field schema for the Credits endpoint.
 *
 * Adding a new filter only requires adding an entry here. The
 * PgCreditRepository's QueryBuilder will pick it up automatically.
 *
 * Notes:
 *   - `bv` is the alias used for `business_view` in the repository's queries.
 *   - `tc` is the alias used for `token_cache` (LEFT JOIN on tokenId).
 *   - `reg.registry_name` comes from a LATERAL join that resolves the
 *     publishing registry's display name.
 */
export const CREDIT_FIELD_SCHEMA: FieldSchema = {
    // ── token_cache columns ─────────────────────────────────────────────
    tokenId: {
        sql: 'tc."tokenId"',
        filter: 'eq',
        sortable: true,
    },
    name: {
        sql: 'COALESCE(tc.name, bv."displayName")',
        filter: 'ilike',
        sortable: true,
    },
    symbol: {
        sql: 'tc.symbol',
        filter: 'ilike',
        sortable: true,
    },
    type: {
        sql: 'tc.type',
        filter: 'ilike',
        sortable: true,
    },
    supply: {
        sql: 'COALESCE(tc."totalSupply", 0)',
        sortable: true,
    },

    // ── Lateral registry join ───────────────────────────────────────────
    registry: {
        sql: 'reg.registry_name',
        filter: 'ilike',
        sortable: true,
    },
    registryDid: {
        sql: 'bv."registryDid"',
        filter: 'eq',
        sortable: true,
    },

    // ── Computed date from consensus timestamp ──────────────────────────
    mintDate: {
        sql: 'to_timestamp(bv."sourceTimestamp"::numeric)',
        sortable: true,
    },

    // ── Audit columns ───────────────────────────────────────────────────
    createdAt: {
        sql: 'bv."createdAt"',
        sortable: true,
    },
    updatedAt: {
        sql: 'bv."updatedAt"',
        sortable: true,
    },
};
