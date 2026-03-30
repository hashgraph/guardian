# CLAUDE.md — Carbon Atlas

## Project Overview

Public-facing Next.js dashboard for exploring verified emission reductions across multiple Guardian policies. Supports Gold Standard MECD v1.2 (testnet + mainnet) and Verra VM0033 (mainnet). Built on [Hedera Guardian](https://github.com/hashgraph/guardian), an open-source MRV platform using Hedera Hashgraph DLT.

**Stack:** Next.js 16 (App Router) | React 19 | TanStack Query | shadcn/ui | Tailwind CSS 4 | Vitest

## Architecture

```
PolicyNetworkProvider (client context, persisted in localStorage)
  → stores: active policy slug + active network
  → auto-switch: selecting VM0033 when on testnet → switches to mainnet
  → fetchProxy builds URL: /api/proxy/{network}/{path}
    → proxy injects Bearer token server-side
  → TanStack Query keys include (slug, network) for separate caches
  → Policy config from lib/policies/ registry
```

- **Multi-policy:** `lib/policies/` defines per-policy config with `networks` map. `providers/PolicyNetworkProvider.tsx` provides combined context. Sidebar methodology selector switches between policies.
- **Multi-network:** Each policy can support one or both networks. Header network dropdown disables unsupported networks.
- **Auth proxy:** `app/api/proxy/[network]/[...path]/route.ts` injects Bearer JWT server-side.
- **Caching:** TanStack Query with 15 min staleTime, 1 hr gcTime. Keyed per slug+network.
- **Theming:** `next-themes` with system default, dark/light toggle in header.

## Key Files

| File | Purpose |
|---|---|
| `lib/policies/types.ts` | PolicyConfig, StatCardConfig, ChartSlot, NetworkDeployment types |
| `lib/policies/registry.ts` | POLICIES array, lookup helpers |
| `lib/policies/mecd.ts` | MECD config (testnet + mainnet) |
| `lib/policies/vm0033.ts` | VM0033 config (mainnet only) |
| `providers/PolicyNetworkProvider.tsx` | Combined policy + network React context |
| `app/api/proxy/[network]/[...path]/route.ts` | Auth proxy with retry-on-500 |
| `lib/api/vc-documents.ts` | API client with normalizeEntityTypes() |
| `lib/utils/trust-chain.ts` | buildChain(), ENTITY_TYPE_CONFIG |
| `hooks/usePolicyVcDocuments.ts` | TanStack Query hooks for policy VCs |
| `hooks/useDashboardStats.ts` | Aggregates stats using policy.statsExtractors |
| `components/vc-views/VCRenderer.tsx` | Two-layer dispatch: policy-specific then generic |
| `components/vc-views/vm0033/PDDView.tsx` | VM0033 PDD viewer with search |
| `components/section-cards.tsx` | Config-driven dashboard stat cards |
| `components/dashboard-charts.tsx` | Config-driven chart slots |
| `docs/adding-a-new-policy.md` | Developer guide for adding policies |

## Entity Types

| Entity Type | Description |
|---|---|
| `approved_report` | Verified monitoring report (emission reduction issuance) |
| `report` | Calculated monitoring report |
| `verification_report` | VVB verification report |
| `validation_report` | VVB validation report |
| `daily_mrv_report` | Aggregated device MRV data |
| `approved_project` | Validated project |
| `project` | Calculated project (auto-completed fields) |
| `project_form` | Raw Project Design Document submission |
| `approved_vvb` | Approved Validation & Verification Body |
| `vvb` | VVB registration |
| `mint_token` | Token minting event |

## Adding a New Policy

See `docs/adding-a-new-policy.md` for the full guide. Quick summary:
1. Create `lib/policies/<slug>.ts` with PolicyConfig
2. Register in `lib/policies/registry.ts`
3. Done — base dashboard, trust chain, and views work automatically
4. Optional: add custom VC renderers in `components/vc-views/<slug>/`

## Development

```bash
npm install
cp .env.example .env.local   # Add Guardian auth credentials
npm run dev                   # http://localhost:3000
npm test                      # Vitest (55 tests)
npm run build                 # Type-check + production build
```

### Environment Variables

See `.env.example`. Policy-specific config (IDs, tokens) lives in `lib/policies/`, NOT in env vars. Env vars only hold:
- `INDEXER_API_BASE_URL` — base URL without network suffix
- Auth credentials (auto-auth or static token)

## Testing

Tests are in `__tests__/` and use Vitest with `environment: "node"`.

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Branding

- **CarbonMarketsHQ:** `public/cmhq-logo-dark.png`, `public/cmhq-logo-light.png` — sidebar footer
- **ATEC Global:** `public/atec-dark.png`, `public/atec-light.png` — MECD project developer
- **Allcot:** `public/allcot-dark.svg`, `public/allcot-light.svg` — VM0033 project developer
