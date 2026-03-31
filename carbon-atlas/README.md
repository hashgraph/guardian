# Carbon Atlas

Public dashboard for exploring verified emission reductions across Guardian policies. Currently supports [Gold Standard MECD 431](https://globalgoals.goldstandard.org/431_ee_ics_methodology-for-metered-measured-energy-cooking-devices/) and [Verra VM0033](https://verra.org/methodologies/vm0033-methodology-for-tidal-wetland-and-seagrass-restoration-v2-1/) on both mainnet and testnet.

Built on [Hedera Guardian](https://github.com/hashgraph/guardian), an open-source MRV platform using Hedera Hashgraph DLT.

## Screenshots

<!-- TODO: Add screenshots from production deployment -->

## Features

- **Multi-Policy Support** — Config-driven architecture for any Guardian carbon methodology. Adding a new policy = 2 files.
- **Trust Chain Explorer** — Trace any issuance back to its project origin through the full Verifiable Credential chain
- **Project Lifecycle Timeline** — Visual progress through PDD → Validation → Monitoring → Verification → Crediting
- **VC-Type Renderers** — Dedicated views for monitoring reports, verification reports, projects, device MRV data, and VVB registrations
- **VM0033 PDD Viewer** — Tabbed view with key info, project boundary tables, 40-year VCU projections, and GeoJSON map
- **Multi-Network** — Switch between mainnet and testnet per policy; mainnet is the default
- **Device Data Table** — Browse metered cooking device records with search, sort, and pagination
- **Hedera Proof Links** — Every document links to its on-chain Hedera Consensus Service message
- **API Proxy** — Server-side auth proxy to the Guardian Indexer API (tokens never exposed to client)

## Tech Stack

Next.js 16 | React 19 | TanStack Query | shadcn/ui | Tailwind CSS 4 | Vitest

## Setup

```bash
npm install
cp .env.example .env.local   # Configure auth (see below)
npm run dev                   # http://localhost:3000
```

### Authentication

The indexer API requires a Bearer token. The app manages token lifecycle automatically — just provide your MGS credentials in `.env.local`:

```env
GUARDIAN_API_URL=https://guardianservice.app/api/v1
GUARDIAN_EMAIL=you@example.com
GUARDIAN_PASSWORD=your_password
```

If your email is linked to multiple Guardian users, the app will log an error with available user IDs. Pick one and set:

```env
GUARDIAN_USER_ID=6667c472175828bcc1d49ba4
```

**How it works:** On first request the server logs in via the MGS SSO chain (`loginByEmail` → `access-token` → `sso/generate`), caches the indexer token (14-day TTL), and refreshes it automatically before it expires. No manual token rotation needed.

**Static token fallback:** If you prefer to manage the token yourself, set `INDEXER_API_TOKEN` in `.env.local` and the auto-auth is skipped entirely.

## Testing

```bash
npm test            # Run all tests (55 tests)
npm run test:watch  # Watch mode
npm run build       # Type-check + production build
```

## Project Structure

```
app/
  api/proxy/[network]/  # Auth proxy — routes to mainnet or testnet indexer
  policy/[slug]/        # Per-policy pages (dashboard, projects, issuances, etc.)
components/
  vc-views/             # Entity-type-specific VC renderers
    vm0033/             # VM0033-specific views (PDDView, ProjectBoundaryMap)
  trust-chain/          # Trust chain visualization
  shared/               # Reusable (ProjectLifecycleTimeline, HederaProofBadge, etc.)
lib/
  policies/             # Policy configs, registry, renderer map, types
  api/                  # API client, auth, VC document fetching
  types/                # TypeScript DTOs
  utils/                # Formatting, Hedera URLs, trust chain logic
hooks/                  # TanStack Query hooks for policy VCs and stats
providers/              # PolicyNetworkProvider (policy + network context)
docs/
  adding-a-new-policy.md  # Developer guide for adding new methodologies
```

## Adding a New Policy

See [docs/adding-a-new-policy.md](docs/adding-a-new-policy.md). Two files to create, zero shared code to modify.

## Third-Party Logos & Trademarks

This project includes logos of third-party companies for identification purposes only. These logos remain the exclusive property of their respective owners:

- **Hedera** — The Hedera logo and HBAR symbol are trademarks of Hedera Hashgraph, LLC. Used with permission in the context of the Guardian open-source project.
- **ATEC Global** — The ATEC logo is a trademark of ATEC Global Ltd. Used with permission to identify the project developer in this demonstration.
- **Allcot** — The Allcot logo is a trademark of Allcot Group. Used with permission to identify the project developer in this demonstration.
- **Gold Standard** — References to the Gold Standard methodology are for identification purposes. Gold Standard is a trademark of The Gold Standard Foundation.

We do not claim ownership of any third-party logos or trademarks. If any rights holder requests removal of their logo from this repository, we will comply promptly.

## License

MIT

---

Built by [CarbonMarketsHQ](https://carbonmarketshq.com)
