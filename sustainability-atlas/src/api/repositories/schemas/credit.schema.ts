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

/**
 * Retired amount for a row, counted only for credits provably minted through
 * Guardian — the same rule mv_project_stats.total_retired uses, so the per-row
 * figures on the Issuances table sum to what the dashboard reports.
 *
 * Non-fungible: `serial_retired_count`, the serials whose metadata carries this
 * mint's VP timestamp and that Mirror Node marks deleted. Serials matching no
 * mint link are excluded — nothing ties them to a policy.
 *
 * Fungible: the token's documented retirement, apportioned across the token's
 * issuances in proportion to each one's size. Fungible units are interchangeable,
 * so there is no fact of the matter about which mint a retired unit came from;
 * a pro-rata share is the only neutral split, and it makes the column sum to the
 * token's true total instead of repeating that total on every row — which is
 * what the previous token-wide expression did.
 *
 * NULLIF guards a token whose VCs declare nothing; the outer COALESCE turns the
 * resulting NULL into 0 rather than letting it swallow the row.
 */
export const RETIRED_EXPR = `(CASE
    WHEN tc.type = 'FUNGIBLE_COMMON' THEN COALESCE(
        ft_ret.token_retired * (${SUPPLY_EXPR} / NULLIF(ft_tot.token_supply, 0)),
        0
    )
    ELSE COALESCE(pml.serial_retired_count, 0)
END)`;

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
    retiredTokens: {
        sql: 'retired_tokens',
        sortable: true,
    },
    /**
     * Sorts on the message's consensus timestamp rather than the displayed
     * `mint_date` alias. The alias is a COALESCE spanning `message` and
     * `project_mint_link`, so no index can serve it and ordering by it forces a
     * full join-and-sort of every mint event before the LIMIT. Consensus
     * timestamp is monotonic and, where a link exists, tracks its mint_date.
     */
    mintDate: {
        sql: 'm."consensusTimestamp"',
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
    projectDisplay: {
        sql: 'project_name',
        sortable: true,
    },
    methodologyDisplay: {
        sql: 'methodology_name',
        sortable: true,
    },
};
