# CLAUDE.md — Carbon Atlas

## Project Overview

Public-facing Next.js dashboard providing a traceable record of verified emission reductions from the [Gold Standard MECD 431](https://globalgoals.goldstandard.org/431_ee_ics_methodology-for-metered-measured-energy-cooking-devices/) methodology — Metered & Measured Energy Cooking Devices. The methodology is digitized on [Hedera Guardian](https://github.com/hashgraph/guardian), an open-source MRV platform using Hedera Hashgraph DLT.

Supports both **mainnet** (production) and **testnet** networks with live switching.

**Stack:** Next.js 16 (App Router) | React 19 | TanStack Query | shadcn/ui | Tailwind CSS 4 | Vitest

## Architecture

```
NetworkProvider (client context, persisted in localStorage, default: mainnet)
  → fetchProxy passes _network param to server proxy
    → proxy builds URL: ${INDEXER_API_URL}/${network}/${path}
      → Bearer token injected server-side (same token for both networks)
  → TanStack Query keys include network (separate caches per network)
  → Policy ID from config map (lib/config/networks.ts)
```

- **Multi-network:** `lib/config/networks.ts` defines per-network settings (policy IDs, token IDs, topic IDs). `providers/NetworkProvider.tsx` provides React context. Network selector in header switches data source live.
- **Auth proxy:** `app/api/proxy/[...path]/route.ts` injects a Bearer JWT server-side so the token never reaches the client bundle. Token lifecycle is managed by `lib/api/auth.ts` which handles the MGS SSO chain (login → access-token → sso/generate) and auto-refreshes before expiry.
- **Caching:** TanStack Query with 15 min staleTime, 1 hr gcTime. All policy VCs are fetched once and filtered client-side. Cache is keyed per-network.
- **Theming:** `next-themes` with system default, dark/light toggle in header.

## Key Files

| File | Purpose |
|---|---|
| `lib/config/networks.ts` | Network config map — mainnet/testnet policy IDs, tokens, topics |
| `providers/NetworkProvider.tsx` | React context for active network, persisted in localStorage |
| `app/api/proxy/[...path]/route.ts` | Auth proxy — injects Bearer token, routes by `_network` param |
| `lib/api/auth.ts` | Server-side token manager — auto login/refresh via MGS SSO chain |
| `lib/api/vc-documents.ts` | API client — getVcDocuments, getAllPolicyVcs, parseCredentialSubject |
| `lib/utils/trust-chain.ts` | buildChain(), ENTITY_TYPE_CONFIG, getProjectDevelopers |
| `hooks/usePolicyVcDocuments.ts` | TanStack Query hooks with client-side filtering/pagination |
| `hooks/useDashboardStats.ts` | Aggregates real tCO₂e and device counts from VC details |
| `components/vc-views/VCRenderer.tsx` | Routes entity types to specific renderers |
| `components/trust-chain/TrustChainView.tsx` | Trust chain visualization with Credits Issued step |
| `components/section-cards.tsx` | Dashboard stat cards with live data |

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

## Trust Chain: Credits Issued Step

The trust chain shows a "Credits Issued" step at the top:
- **Completed** (solid green) when root VC is `approved_report` — shows ER_y amount and links to token on Hashscan
- **Pending** (dashed ghost) when root is earlier in the lifecycle

## Development

```bash
npm install
cp .env.example .env.local   # Add Guardian auth credentials
npm run dev                   # http://localhost:3000
npm test                      # Vitest
npm run build                 # Type-check + production build
```

### Environment Variables

See `.env.example` for the full list. Network-specific config (policy IDs, token IDs) lives in `lib/config/networks.ts`, NOT in env vars. Env vars only hold:
- `INDEXER_API_URL` — base URL without network suffix (network appended dynamically)
- Auth credentials (auto-auth or static token)

Auth supports two modes:
- **Auto-auth (recommended):** Set `GUARDIAN_API_URL`, `GUARDIAN_EMAIL`, `GUARDIAN_PASSWORD` (and optionally `GUARDIAN_USER_ID`). Tokens are managed automatically.
- **Static token:** Set `INDEXER_API_TOKEN` to skip auto-auth. Must be manually rotated when it expires (~14 days).

## Testing

Tests are in `__tests__/` and use Vitest with `environment: "node"` (not jsdom — the tests are pure logic, no DOM needed).

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Branding

- **CarbonMarketsHQ:** `public/cmhq-logo-dark.png`, `public/cmhq-logo-light.png` — sidebar footer
- **ATEC Global:** `public/atec-dark.png`, `public/atec-light.png` — project developer badge
- All logos have dark/light variants for theme support

## Adding a New Network Policy

To add a new policy (or update to a newer version), edit `lib/config/networks.ts`:
1. Add the policy to the appropriate network's `policies` array (latest first)
2. The app defaults to `policies[0]` — the first entry is the active policy
