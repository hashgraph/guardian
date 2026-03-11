# CLAUDE.md — MECD Indexer

## Project Overview

Public-facing Next.js dashboard for exploring carbon credit issuances from the [Gold Standard MECD 431](https://globalgoals.goldstandard.org/431_ee_ics_methodology-for-metered-measured-energy-cooking-devices/) methodology — Metered & Measured Energy Cooking Devices. The methodology is digitized on [Hedera Guardian](https://github.com/hashgraph/guardian), an open-source MRV platform using Hedera Hashgraph DLT.

**Stack:** Next.js 16 (App Router) | React 19 | TanStack Query | shadcn/ui | Tailwind CSS 4 | Vitest

## Architecture

```
Guardian Indexer API
  → /api/proxy/[...path]  (server-side auth proxy)
    → TanStack Query (client-side caching)
      → React components
```

- **Auth proxy:** `app/api/proxy/[...path]/route.ts` injects a Bearer JWT server-side so the token never reaches the client bundle.
- **Caching:** TanStack Query with 15 min staleTime, 1 hr gcTime. All policy VCs are fetched once and filtered client-side.
- **Theming:** `next-themes` with system default, dark/light toggle in header.

## Key Files

| File | Purpose |
|---|---|
| `app/api/proxy/[...path]/route.ts` | Auth proxy — injects Bearer token server-side |
| `lib/api/vc-documents.ts` | API client — getVcDocuments, getAllPolicyVcs, parseCredentialSubject |
| `lib/utils/trust-chain.ts` | buildChain(), ENTITY_TYPE_CONFIG, getProjectDevelopers |
| `hooks/usePolicyVcDocuments.ts` | TanStack Query hooks with client-side filtering/pagination |
| `hooks/useDashboardStats.ts` | Aggregates real tCO₂e and device counts from VC details |
| `components/vc-views/VCRenderer.tsx` | Routes entity types to specific renderers |
| `components/trust-chain/TrustChainView.tsx` | Trust chain visualization |
| `components/section-cards.tsx` | Dashboard stat cards with live data |

## Entity Types

| Entity Type | Description |
|---|---|
| `approved_report` | Verified monitoring report (carbon credit issuance) |
| `report` | Calculated monitoring report |
| `verification_report` | VVB verification report |
| `validation_report` | VVB validation report |
| `daily_mrv_report` | Aggregated device MRV data |
| `approved_project` | Validated project |
| `project` | Calculated project (auto-completed fields) |
| `project_form` | Raw Project Design Document submission |
| `approved_vvb` | Approved Validation & Verification Body |
| `vvb` | VVB registration |

## Development

```bash
npm install
cp .env.example .env.local   # Add Guardian Indexer API token
npm run dev                   # http://localhost:3000
npm test                      # Vitest
npm run build                 # Type-check + production build
```

### Environment Variables

See `.env.example` for the full list. The `INDEXER_API_TOKEN` is a Bearer JWT for the Guardian Indexer API — must be set server-side only.

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
