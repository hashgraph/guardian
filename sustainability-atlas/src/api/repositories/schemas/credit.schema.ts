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
/** Minted amount for a row: the attributed link amount, else the raw VC amount. */
export const SUPPLY_EXPR = `COALESCE(pml.amount::numeric, (m.documents->'credentialSubject'->0->>'amount')::numeric)`;

/** Mint timestamp for a row: the attributed link date, else the message consensus time. */
export const MINT_DATE_EXPR = `COALESCE(pml.mint_date, to_timestamp(m."consensusTimestamp"::numeric))`;

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

    // ── Row values (SELECT aliases for sorting; the underlying expression is
    //    repeated for filtering, since an alias can't appear in a WHERE) ─────
    supply: {
        sql: 'total_supply',
        sortable: true,
    },
    mintDate: {
        sql: 'mint_date',
        sortable: true,
    },
    supplyMin: {
        sql: SUPPLY_EXPR,
        filter: 'gte',
    },
    supplyMax: {
        sql: SUPPLY_EXPR,
        filter: 'lte',
    },
    mintDateFrom: {
        sql: MINT_DATE_EXPR,
        filter: 'gte',
    },
    mintDateTo: {
        sql: MINT_DATE_EXPR,
        filter: 'lte',
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
