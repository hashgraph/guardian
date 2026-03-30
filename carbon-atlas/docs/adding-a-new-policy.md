# Adding a New Policy to Carbon Atlas

This guide walks through adding support for a new Guardian policy/methodology to Carbon Atlas. A base dashboard, trust chain, and document views work automatically for any policy — custom renderers are optional polish.

## Prerequisites

- The policy must be published and running on a Guardian indexer
- You need the policy's Hedera ID (consensus timestamp of the policy topic)
- Optional: token ID and policy topic ID from Hedera

## Step 1: Create the Policy Config

Create `lib/policies/<slug>.ts`. The slug becomes the URL identifier (`/policy/<slug>/dashboard`).

```typescript
import type { PolicyConfig } from "./types"

export const acm0002: PolicyConfig = {
  slug: "acm0002",
  name: "ACM0002",
  fullName: "Grid-Connected Electricity Generation from Renewable Sources",
  standard: "CDM",
  description: "CDM methodology for grid-connected renewable energy projects",

  // Networks this policy is deployed on.
  // Each entry needs at least policyHederaId.
  // tokenId and policyTopicId are optional but enable token links in the trust chain.
  networks: {
    mainnet: {
      policyHederaId: "1234567890.123456789",
      tokenId: "0.0.12345678",        // optional
      policyTopicId: "0.0.12345679",  // optional
    },
    // testnet: { policyHederaId: "..." }  // add if also on testnet
  },

  links: {
    methodology: "https://cdm.unfccc.int/methodologies/...",
    hederaPolicy: "https://guardian.hedera.com/guardian/...",
  },

  // Optional: project developer branding (logo shown on project/issuance pages)
  projectDeveloper: {
    name: "Company Name",
    url: "https://company.com",
    logoDark: "/company-dark.png",
    logoLight: "/company-light.png",
  },

  dashboard: {
    // Stat cards shown at top of dashboard (max 4 recommended).
    // source: "count"    → count VCs of the given entityType
    // source: "computed" → pull a value from useDashboardStats() via valuePath
    statCards: [
      {
        key: "projects",
        label: "Registered Projects",
        description: "Projects submitted to this policy",
        icon: "IconSitemap",
        source: "count",
        entityType: "project_form",
        format: "number",
      },
      {
        key: "issuances",
        label: "Verified Issuances",
        description: "Approved monitoring reports on Hedera",
        icon: "IconCertificate",
        source: "count",
        entityType: "approved_report",
        format: "number",
      },
      {
        key: "ery",
        label: "Emission Reductions",
        description: "Total tCO₂e from verified reports",
        icon: "IconLeaf",
        iconColor: "text-green-600",
        source: "computed",
        valuePath: "totalERy",  // key from useDashboardStats() return value
        format: "tco2e",
      },
      {
        key: "validation-status",
        label: "Lifecycle Stage",
        description: "Current stage in validation lifecycle",
        icon: "IconClipboardCheck",
        source: "computed",
        valuePath: "validationStage",
        format: "text",
      },
    ],

    // Chart slots rendered in order.
    // Available: "emission-timeline" | "device-map" | "project-overview" | "none"
    charts: ["emission-timeline"],
  },

  // Dot-separated paths into the approved_report credential subject for stats.
  // Inspect a sample VC from your policy to find the right paths (see Step 2.5).
  // Leave as {} if the policy has no monitoring reports yet.
  statsExtractors: {
    eryPath: "emission_reduction.ER_y",
    periodPath: "monitoring_period.to",    // optional
    deviceCountPath: "total_devices",      // optional

    // Set vcuEstimatePath only if your policy has VCU/ERU projections in
    // project_form VCs before any issuances occur (e.g. VM0033-style).
    // vcuEstimatePath: "total_vcus",
  },

  // Optional: project lifecycle stages shown on project detail pages.
  // Each stage is "complete" when its entityType is present in the VC chain.
  lifecycleStages: [
    { label: "PDD Submitted",      entityType: "project_form",       description: "Project Design Document submitted by developer" },
    { label: "Calculated",         entityType: "project",            description: "Emission calculations completed by policy engine" },
    { label: "Validation Report",  entityType: "validation_report",  description: "Third-party VVB validation report submitted" },
    { label: "Validated",          entityType: "approved_project",   description: "Project validated and approved by registry" },
    { label: "Monitoring Report",  entityType: "report",             description: "Monitoring report with measured reductions" },
    { label: "Verification Report",entityType: "verification_report",description: "Third-party VVB verification of monitoring data" },
    { label: "Project Crediting",  entityType: "approved_report",    description: "Emission reductions issued as credits on Hedera" },
  ],
}
```

## Step 2: Register the Policy

Edit `lib/policies/registry.ts` — add the import and append to the `POLICIES` array:

```typescript
import { acm0002 } from "./acm0002"

export const POLICIES: PolicyConfig[] = [mecd, vm0033, acm0002]
```

That's it for base functionality. The app will now:
- Show the policy in the sidebar methodology list
- Serve a dashboard at `/policy/acm0002/dashboard` with your stat cards and charts
- Show projects, issuances, and trust chains using generic VC views
- Enable/disable network options based on your `networks` config

## Step 2.5: Find the Right statsExtractors Paths

The most important config to get right is `statsExtractors`. Open a sample VC from your policy to inspect its credential subject structure:

```
GET /api/proxy/mainnet/entities/vc-documents?analytics.policyId=<policyHederaId>&analytics.entityType=approved_report
```

Pick a `consensusTimestamp` from the result and fetch the detail:

```
GET /api/proxy/mainnet/entities/vc-documents/<consensusTimestamp>
```

The `item.documents[0]` field contains a JSON string — parse it to find your credential subject fields. Look for:
- Your emission reduction value (becomes `eryPath`)
- Your monitoring period end date (becomes `periodPath`)
- Any device/unit count (becomes `deviceCountPath`)

For project-form VCU estimates (e.g. VM0033), do the same with `entityType=project_form`.

## Step 3 (Optional): Add Custom VC Renderers

The generic views (`ProjectView`, `MonitoringReportView`, etc.) work for most policies. If your credential subject has a different structure, create custom renderers.

**1. Create your components:**

```
components/vc-views/acm0002/
  ProjectView.tsx
  MonitoringReportView.tsx
```

Each component must accept `RendererProps` from `lib/policies/types.ts`:

```typescript
// components/vc-views/acm0002/ProjectView.tsx
"use client"

import type { RendererProps } from "@/lib/policies/types"

export function ACM0002ProjectView({ cs, rawDocuments, entityType }: RendererProps) {
  const projectName = (cs.project_details as Record<string, unknown>)?.name as string
  return (
    <div>
      <h3>{projectName}</h3>
      {/* Your rendering logic */}
    </div>
  )
}
```

**2. Register in `lib/policies/renderers.ts`:**

```typescript
import { ACM0002ProjectView } from "@/components/vc-views/acm0002/ProjectView"

export const POLICY_RENDERERS = {
  vm0033: { ... },  // existing

  acm0002: {
    project_form: ACM0002ProjectView,
    project: ACM0002ProjectView,
    approved_project: ACM0002ProjectView,
  },
}
```

`VCRenderer` checks `POLICY_RENDERERS[policy.slug]` first, then falls back to the generic views.

> **Why a separate file?** Policy config files (`lib/policies/*.ts`) are imported by server components to validate URL slugs. Keeping component imports separate prevents browser-only libraries (maps, charting) from being bundled server-side.

## Step 4 (Optional): Add a Custom Chart

If the built-in chart slots don't fit your policy:

1. Add a value to the `ChartSlot` union in `lib/policies/types.ts`:
   ```typescript
   export type ChartSlot = "emission-timeline" | "device-map" | "project-overview" | "none" | "my-chart"
   ```

2. Implement the chart in `components/dashboard-charts.tsx`:
   ```typescript
   case "my-chart":
     return <MyChart data={chartData} />
   ```

3. Reference the slot in your policy config: `charts: ["my-chart"]`

## Step 5 (Optional): Add Logo Assets

1. Add PNG/SVG files to `public/` — provide separate dark and light variants if needed
2. Reference them in `projectDeveloper.logoDark` and `projectDeveloper.logoLight`

For dark backgrounds, a white-padded variant helps logo legibility (Carbon Atlas adds a white background chip automatically in dark mode if dark/light logos are the same file).

## Step 6 (Optional): Add More Stat Card Icons

The `ICON_MAP` in `components/section-cards.tsx` covers common methodology categories:

| Group | Available icons |
|---|---|
| Core | `IconCertificate`, `IconLeaf`, `IconSitemap`, `IconDevices`, `IconClipboardCheck` |
| Energy | `IconBolt`, `IconSun`, `IconWind`, `IconFlame` |
| Land / Nature | `IconTrees`, `IconPlant`, `IconDroplet` |
| People / Org | `IconBuilding`, `IconUsers` |
| Data / Finance | `IconChartBar`, `IconCoin` |
| Location / Time | `IconMapPin`, `IconGlobe`, `IconCalendar`, `IconRuler` |

To add more: import from `@tabler/icons-react` and add to `ICON_MAP`.

---

## How It Works

### Data Flow

```
PolicyConfig (policyHederaId)
  → usePolicyVcDocuments hook
  → GET /api/proxy/{network}/entities/vc-documents?analytics.policyId={id}
  → normalizeEntityTypes() — infers entity types from schema names (mainnet compat)
  → useDashboardStats() — extracts stats using statsExtractors paths
  → SectionCards / DashboardCharts — render using policy.dashboard config
```

### Trust Chain

The trust chain visualization works generically. It follows `options.relationships` arrays on VCs to build the lifecycle graph:

```
project_form → project → validation_report → approved_project →
daily_mrv_report → report → verification_report → approved_report
```

The "Project Crediting" step completes when an `approved_report` is reachable from the selected VC via bidirectional BFS over the relationship graph.

### Lifecycle Timeline

`ProjectLifecycleTimeline` renders when `lifecycleStages` is defined in your config. It runs a full bidirectional BFS from the viewed VC's relationship graph, marks each stage complete when that entity type is found in the traversal.

### Entity Type Normalization

On mainnet, the indexer may not populate `options.entityType`. `normalizeEntityTypes()` in `lib/api/vc-documents.ts` applies a 3-pass algorithm:
1. Derive from `analytics.schemaName` + `options.documentStatus`
2. Disambiguate `project` vs `project_form` using the relationship graph
3. Infer remaining types from context

If your policy uses non-standard schema names, extend the schema matching in Pass 1.

### Available Computed Stat Values

`useDashboardStats()` returns these values for use in `source: "computed"` stat cards via `valuePath`:

| valuePath | Type | Description |
|---|---|---|
| `totalERy` | `number \| null` | Sum of `eryPath` from approved reports; falls back to `vcuEstimatePath` from project forms |
| `totalDevices` | `number \| null` | Device count from reports; falls back to MRV report field0 arrays |
| `validationStage` | `string` | `"Issued"` / `"Validated"` / `"Submitted"` / `"No Projects"` |
| `issuanceCount` | `number` | Count of `approved_report` VCs |
| `projectCount` | `number` | Count of `approved_project` VCs |
| `projectFormCount` | `number` | Count of `project_form` VCs |
| `mrvBatchCount` | `number` | Count of `daily_mrv_report` VCs |

---

## Guardian Policy Design Requirements

For Carbon Atlas features to work correctly, your Guardian policy must produce VCs with specific fields. If features aren't working, check these:

| Feature | Requirement |
|---|---|
| Trust chain | VCs must have `options.relationships[]` — array of `consensusTimestamp` strings pointing to related VCs |
| Entity type detection (mainnet) | VCs must have `analytics.schemaName` populated, OR explicit `options.entityType` |
| Dashboard stats | `approved_report` credential subject must contain the fields your `statsExtractors` paths point to |
| Lifecycle timeline | VCs must be connected via `relationships` — disconnected VCs won't be reached by BFS |
| VCU projections (pre-issuance) | `project_form` credential subject must contain the field your `vcuEstimatePath` points to |

If VCs lack `options.relationships`, trust chain and lifecycle will show as single nodes with no connections.

---

## Checklist

- [ ] Create `lib/policies/<slug>.ts` with PolicyConfig
- [ ] Register in `lib/policies/registry.ts`
- [ ] Inspect a sample VC to verify `statsExtractors` paths
- [ ] Test dashboard at `/policy/<slug>/dashboard`
- [ ] Verify stat cards show correct data
- [ ] Check projects and issuances pages render
- [ ] Click into a project — verify lifecycle timeline and trust chain
- [ ] If credential subject differs from defaults:
  - [ ] Create `components/vc-views/<slug>/*View.tsx` components
  - [ ] Register in `lib/policies/renderers.ts`
- [ ] Add project developer logos (optional)
- [ ] Test network switching if policy is on multiple networks
