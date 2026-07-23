import { FieldSchema } from '../query-builder';

/**
 * Field schema for the Credits/Issuances endpoint.
 *
 * Column aliases match the SELECT output of pg-credit.repository.ts findAll(),
 * which is sourced from MintToken VCs (message table) grouped by
 * (tokenId, project_key).
 *
 * Table aliases in use:
 *   m    — message (MintToken VC rows)
 *   pml  — project_mint_link (pre-computed per-project attribution)
 *   tc   — token_cache (Mirror Node token metadata)
 *   proj — LATERAL: resolved project from business_view PROJECT
 *   meth — LATERAL: resolved methodology from business_view METHODOLOGY
 *   reg  — LATERAL: resolved registry from business_view REGISTRY
 *   cred — LATERAL: token's own registryDid from business_view CREDIT (fallback for unlinked mints)
 *
 * Aggregate fields (supply, mintDate) use SELECT output aliases so ORDER BY
 * can reference them by name in a grouped query. They carry no filter operator
 * since aggregate expressions cannot appear in a WHERE clause.
 */
export const CREDIT_FIELD_SCHEMA: FieldSchema = {
    // ── Token identity ──────────────────────────────────────────────────
    tokenId: {
        sql: `(m.documents->'credentialSubject'->0->>'tokenId')`,
        filter: 'eq',
        sortable: true,
    },
    name: {
        sql: 'tc.name',
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
        sortable: true,
    },

    // ── Aggregates (SELECT aliases — sortable only) ─────────────────────
    supply: {
        sql: 'total_supply',
        sortable: true,
    },
    mintDate: {
        sql: 'mint_date',
        sortable: true,
    },

    // ── Attribution ─────────────────────────────────────────────────────
    registry: {
        sql: 'reg.registry_name',
        filter: 'ilike',
        sortable: true,
    },
    registryDid: {
        sql: 'COALESCE(proj.registry_did, cred.registry_did)',
        filter: 'eq',
        sortable: true,
    },
};
