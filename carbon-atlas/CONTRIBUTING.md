# Contributing to MECD Indexer

Thanks for your interest in contributing! This project is a public dashboard for exploring carbon credit issuances from the Gold Standard MECD 431 methodology on Hedera Guardian.

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- A **Guardian Indexer API token** (Bearer JWT) — reach out to the maintainers or generate one from the [Guardian Indexer](https://indexer.guardianservice.app)

### Setup

```bash
git clone https://github.com/gautamp8/mecd-indexer.git
cd mecd-indexer
npm install
cp .env.example .env.local
```

Edit `.env.local` and add your API token:

```
INDEXER_API_TOKEN=your_bearer_jwt_here
INDEXER_API_URL=https://indexer.guardianservice.app/api/v1/testnet
NEXT_PUBLIC_POLICY_HEDERA_ID=1767599197.624837133
NEXT_PUBLIC_HEDERA_NETWORK=testnet
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture Overview

```
Guardian Indexer API
  -> /api/proxy/[...path]  (server-side auth proxy, injects Bearer token)
    -> TanStack Query (client-side caching, 15 min stale / 1 hr gc)
      -> React components
```

- **Auth proxy** (`app/api/proxy/[...path]/route.ts`): All API calls go through this server-side proxy so the JWT token never reaches the client bundle.
- **Data fetching** (`lib/api/vc-documents.ts`): Fetches all policy VCs in one call, filters client-side by entity type (the indexer API ignores `entityType` filter params).
- **VC renderers** (`components/vc-views/`): Each entity type has a dedicated renderer. `VCRenderer.tsx` dispatches based on `entityType`.
- **Trust chain** (`lib/utils/trust-chain.ts`): Traverses VC relationships depth-first from a root document.

## Project Structure

```
app/                     # Next.js App Router pages
  api/proxy/             # Auth proxy to Guardian Indexer API
  dashboard/             # Overview with stats and recent issuances
  issuances/             # Issuance list + trust chain detail
  projects/              # Project list + detail
components/
  vc-views/              # Entity-type-specific VC renderers
  trust-chain/           # Trust chain visualization
  shared/                # Reusable components (DeviceDataTable, HederaProofBadge, etc.)
  ui/                    # shadcn/ui components
hooks/                   # TanStack Query hooks
lib/
  api/                   # API client (fetchProxy, vc-documents)
  types/                 # TypeScript interfaces
  utils/                 # Formatting, Hedera URLs, trust chain logic
__tests__/               # Vitest tests
```

## Development Guidelines

### Code Style

- **TypeScript** — all code is typed. Run `npm run build` to type-check.
- **Tailwind CSS 4** — utility-first styling. Use `cn()` from `lib/utils.ts` for conditional classes.
- **shadcn/ui** — all UI components come from shadcn. Add new ones with `npx shadcn@latest add <component>`.
- **No CSS modules or styled-components** — Tailwind only.

### Adding a New VC Renderer

1. Create a new component in `components/vc-views/` (e.g., `NewEntityView.tsx`)
2. The component receives `cs` (parsed credential subject) and `rawDocuments` as props
3. Use the `get(obj, "dotted.path")` helper pattern for nested field access (see existing renderers)
4. Add a case to the switch in `components/vc-views/VCRenderer.tsx`

### Testing

Tests use Vitest with `environment: "node"` (pure logic, no DOM).

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Add tests in the `__tests__/` directory. Focus on:
- Data transformation logic (trust chain building, VC parsing)
- API client behavior (pagination, filtering)

### Key API Quirks

These are documented in detail in `CLAUDE.md` but the critical ones:

1. **`options.entityType` filter is ignored by the API** — all filtering must be done client-side
2. **Individual VC lookup uses `consensusTimestamp`** as the path param, not the MongoDB `id`
3. **`documents[]` in list responses** contain MongoDB ref IDs (useless). Only the detail endpoint returns full VC JSON.

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run type check: `npm run build`
6. Commit with a clear message describing what and why
7. Push and open a pull request

## Reporting Issues

Open an issue on [GitHub](https://github.com/gautamp8/mecd-indexer/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/OS if relevant

## License

MIT — see [LICENSE](LICENSE) for details.
