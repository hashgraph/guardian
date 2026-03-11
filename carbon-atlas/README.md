# MECD Indexer

Public dashboard for the [Gold Standard MECD 431](https://globalgoals.goldstandard.org/431_ee_ics_methodology-for-metered-measured-energy-cooking-devices/) methodology — Metered & Measured Energy Cooking Devices.

This indexer provides a transparent, read-only view of carbon credit issuances from a digitized MECD methodology running on [Hedera Guardian](https://github.com/hashgraph/guardian).

## Screenshots

### Dashboard
![Dashboard](public/screenshots/dashboard.png)

### Issuances
![Issuances](public/screenshots/issuances.png)

### Projects
![Projects](public/screenshots/projects.png)

### Trust Chain
![Trust Chain](public/screenshots/trust-chain.png)

### Monitoring Report
![Monitoring Report](public/screenshots/monitoring-report.png)

### Device ID Search
![Device ID Search](public/screenshots/device-search.png)

### Verify Document
![Verify](public/screenshots/verify.png)

## Features

- **Trust Chain Explorer** — Trace any issuance back to its project origin through the full Verifiable Credential chain
- **VC-Type Renderers** — Dedicated views for monitoring reports, verification reports, projects, device MRV data, and VVB registrations
- **Device Data Table** — Browse 3,254 metered cooking device records with search, sort, and pagination
- **Hedera Proof Links** — Every document links to its on-chain Hedera Consensus Service message
- **API Proxy** — Server-side auth proxy to the Guardian Indexer API (tokens never exposed to client)

## Tech Stack

Next.js 16 | React 19 | TanStack Query | shadcn/ui | Tailwind CSS 4 | Vitest

## Setup

```bash
npm install
cp .env.example .env.local   # Add your Guardian Indexer API token
npm run dev                   # http://localhost:3000
```

## Testing

```bash
npm test        # Run all tests
npm run test:watch  # Watch mode
```

## Project Structure

```
app/              # Next.js App Router pages
  api/proxy/      # Auth proxy to Guardian Indexer
  dashboard/      # Overview with stats and recent issuances
  issuances/      # Issuance list + trust chain detail
  projects/       # Project list + detail
components/
  vc-views/       # Entity-type-specific VC renderers
  trust-chain/    # Trust chain visualization
  shared/         # Reusable components (DeviceDataTable, HederaProofBadge)
lib/
  api/            # API client and data fetching
  types/          # TypeScript DTOs
  utils/          # Formatting, Hedera URLs, trust chain logic
```

## License

MIT

---

Built by [CarbonMarketsHQ](https://carbonmarketshq.com)
