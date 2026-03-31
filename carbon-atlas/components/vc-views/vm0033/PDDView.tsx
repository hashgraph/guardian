"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import {
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconCheck,
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRawVc } from "@/lib/utils/format"
import type { GeoJsonObject } from "geojson"

// Dynamically import the map (SSR: false) to avoid server-side leaflet errors
const ProjectBoundaryMap = dynamic(
  () =>
    import("./ProjectBoundaryMap").then((mod) => ({
      default: mod.ProjectBoundaryMap,
    })),
  { ssr: false }
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface PDDViewProps {
  cs: Record<string, unknown>
  rawDocuments?: string[]
  entityType: string
  schema?: Record<string, unknown>
}

export interface FieldEntry {
  key: string
  label: string
  value: unknown
  sectionId: string
}

export interface Section {
  id: string
  title: string
  fields: FieldEntry[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\bfield\d+\b/gi, (m) => m)
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function humanizeBoundaryKey(key: string): string {
  // Strip leading prefix (baseline_ or project_)
  const stripped = key
    .replace(/^baseline_/, "")
    .replace(/^project_/, "")
  return stripped
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function flattenObject(
  obj: unknown,
  prefix = "",
  sectionId = "general"
): FieldEntry[] {
  const entries: FieldEntry[] = []
  if (!obj || typeof obj !== "object") return entries

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "type" || key === "@context" || key === "id") continue
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenObject(value, fullKey, sectionId))
    } else {
      entries.push({
        key: fullKey,
        label: humanizeKey(key),
        value,
        sectionId,
      })
    }
  }
  return entries
}

function renderFieldValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 6 })
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—"
    if (typeof value[0] === "object") {
      return (
        <span className="text-xs text-muted-foreground">
          [{value.length} items]
        </span>
      )
    }
    return value.join(", ")
  }
  const str = String(value)
  if (str.length > 300) {
    return <span className="text-sm">{str.slice(0, 300)}…</span>
  }
  return str
}

/**
 * Format an ISO date string (YYYY-MM-DD) as a readable date.
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
  } catch {
    return dateStr
  }
}

/**
 * Strip HTML entities from a string and return the first `lines` non-empty lines.
 */
function stripHtml(raw: string | undefined, lines = 2): string {
  if (!raw) return "—"
  const stripped = raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
  const parts = stripped
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.slice(0, lines).join(", ")
}

/**
 * Format a number with commas and optional decimal places.
 */
function fmtNum(
  val: number | undefined | null,
  decimals = 2,
  fallback = "—"
): string {
  if (val === undefined || val === null || isNaN(Number(val))) return fallback
  const n = Number(val)
  if (n === 0) return fallback
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ─── buildSections ────────────────────────────────────────────────────────────

/**
 * Build collapsible sections from a credential subject.
 * Accepts an optional `excludeKeys` set to skip top-level keys
 * (e.g. those shown in dedicated tabs).
 */
export function buildSections(
  cs: Record<string, unknown>,
  excludeKeys?: Set<string>
): Section[] {
  const sections: Section[] = []
  const topLevelFields: FieldEntry[] = []

  for (const [key, value] of Object.entries(cs)) {
    if (key === "type" || key === "@context" || key === "id") continue
    if (excludeKeys?.has(key)) continue

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sectionTitle = humanizeKey(key)
      const fields = flattenObject(value, key, key)
      if (fields.length > 0) {
        sections.push({ id: key, title: sectionTitle, fields })
      }
    } else {
      topLevelFields.push({
        key,
        label: humanizeKey(key),
        value,
        sectionId: "top",
      })
    }
  }

  if (topLevelFields.length > 0) {
    sections.unshift({ id: "top", title: "General", fields: topLevelFields })
  }

  return sections
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────

function CollapsibleSection({
  section,
  isExpanded,
  onToggle,
  searchQuery,
}: {
  section: Section
  isExpanded: boolean
  onToggle: () => void
  searchQuery: string
}) {
  const filteredFields = useMemo(() => {
    if (!searchQuery) return section.fields
    const q = searchQuery.toLowerCase()
    return section.fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        String(f.value).toLowerCase().includes(q)
    )
  }, [section.fields, searchQuery])

  if (searchQuery && filteredFields.length === 0) return null

  const showExpanded = isExpanded || (!!searchQuery && filteredFields.length > 0)

  return (
    <div className="rounded-lg border">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {showExpanded ? (
          <IconChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium flex-1">{section.title}</span>
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {filteredFields.length}
          {searchQuery && filteredFields.length !== section.fields.length
            ? ` / ${section.fields.length}`
            : ""}
        </Badge>
      </button>
      {showExpanded && (
        <div className="border-t px-3 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {filteredFields.map((f) => (
              <div key={f.key} className="py-1">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="text-sm break-words">
                  {renderFieldValue(f.value)}
                </dd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Key Info Tab ─────────────────────────────────────────────────────────────

interface KeyInfoField {
  label: string
  value: React.ReactNode
  wide?: boolean
}

function KeyInfoTab({ cs }: { cs: Record<string, unknown> }) {
  const pd = cs.project_details as Record<string, unknown> | undefined
  const instances = cs.project_data_per_instance as
    | { instance_name?: string; project_instance?: Record<string, unknown> }[]
    | undefined
  const firstInstance = instances?.[0]
  const projInstance = firstInstance?.project_instance as
    | Record<string, unknown>
    | undefined
  const individualParams = projInstance?.individual_parameters as
    | Record<string, unknown>
    | undefined
  const netErr = projInstance?.net_ERR as Record<string, unknown> | undefined

  const g8 = pd?.G8 as { G5?: string; G6?: string } | undefined
  const creditingStart = g8?.G5
  const creditingEnd = g8?.G6
  const creditingPeriodLabel =
    creditingStart && creditingEnd
      ? `${formatDate(creditingStart)} – ${formatDate(creditingEnd)}`
      : "—"

  const totalVcu = netErr?.total_VCU_per_instance as number | undefined
  const totalVcuFormatted =
    totalVcu !== undefined
      ? `${Math.round(totalVcu).toLocaleString("en-US")} tCO₂e`
      : (pd?.G55 as string | undefined)
        ? `${pd?.G55 as string} tCO₂e`
        : "—"

  const bufferPct = individualParams?.["individual_params_buffer_%"] as
    | number
    | undefined
  const bufferLabel =
    bufferPct !== undefined
      ? `${Math.round(bufferPct * 100)}%`
      : "—"

  const creditingLen = individualParams?.individual_params_crediting_period as
    | number
    | undefined

  const websiteUrl = pd?.G7 as string | undefined

  const fields: KeyInfoField[] = [
    { label: "Project Title", value: cs.projectTitle as string ?? "—", wide: true },
    {
      label: "Instance Name",
      value: firstInstance?.instance_name ?? "—",
    },
    {
      label: "Certification Type",
      value: cs.project_cert_type as string ?? "—",
    },
    {
      label: "Project Type",
      value: pd?.G151 as string ?? "—",
    },
    {
      label: "Scale",
      value: pd?.G185 as string ?? "—",
    },
    {
      label: "Project Developer",
      value: stripHtml(pd?.G40 as string | undefined, 2),
    },
    {
      label: "Validation & Verification Body",
      value: pd?.G41 as string ?? "—",
    },
    {
      label: "Local Entity",
      value: pd?.G45 as string ?? "—",
    },
    {
      label: "VCS Standard",
      value: pd?.G17 as string ?? "—",
    },
    {
      label: "CCB Standard",
      value: pd?.G18 as string ?? "—",
    },
    {
      label: "Crediting Period",
      value: creditingPeriodLabel,
    },
    {
      label: "Crediting Period Length",
      value: creditingLen !== undefined ? `${creditingLen} years` : "—",
    },
    {
      label: "Projected VCUs",
      value: totalVcuFormatted,
    },
    {
      label: "Buffer Pool",
      value: bufferLabel,
    },
    {
      label: "Project Website",
      value: websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          <IconExternalLink className="size-3" />
        </a>
      ) : (
        "—"
      ),
      wide: true,
    },
  ]

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
      {fields.map((f) => (
        <div
          key={f.label}
          className={f.wide ? "sm:col-span-2" : undefined}
        >
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            {f.label}
          </dt>
          <dd className="text-sm font-medium break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─── Project Boundary Tab ─────────────────────────────────────────────────────

interface BoundaryEntry {
  sourceKey: string
  label: string
  gas: string
  included: boolean
  justification: string
}

function parseBoundaryScenario(
  scenarioObj: Record<string, unknown>
): BoundaryEntry[] {
  return Object.entries(scenarioObj).map(([key, val]) => {
    const v = val as {
      gas?: string
      included?: boolean
      justification?: string
    }
    return {
      sourceKey: key,
      label: humanizeBoundaryKey(key),
      gas: v?.gas ?? "—",
      included: !!v?.included,
      justification: v?.justification ?? "—",
    }
  })
}

function BoundaryScenarioTable({
  title,
  entries,
}: {
  title: string
  entries: BoundaryEntry[]
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground w-1/4">
                Source
              </th>
              <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground w-16">
                Gas
              </th>
              <th className="px-3 py-2 text-center font-medium text-xs text-muted-foreground w-20">
                Included?
              </th>
              <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">
                Justification
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <BoundaryRow key={entry.sourceKey} entry={entry} isLast={idx === entries.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BoundaryRow({
  entry,
  isLast,
}: {
  entry: BoundaryEntry
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const longJustification =
    entry.justification !== "—" && entry.justification.length > 120

  return (
    <tr className={isLast ? undefined : "border-b"}>
      <td className="px-3 py-2 font-medium text-xs">{entry.label}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{entry.gas}</td>
      <td className="px-3 py-2 text-center">
        {entry.included ? (
          <Badge
            variant="outline"
            className="text-[10px] border-green-600/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 gap-1"
          >
            <IconCheck className="size-3" />
            Yes
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {longJustification && !expanded ? (
          <>
            {entry.justification.slice(0, 120)}…{" "}
            <button
              className="text-primary underline underline-offset-2 hover:no-underline"
              onClick={() => setExpanded(true)}
            >
              more
            </button>
          </>
        ) : (
          <>
            {entry.justification}
            {longJustification && (
              <>
                {" "}
                <button
                  className="text-primary underline underline-offset-2 hover:no-underline"
                  onClick={() => setExpanded(false)}
                >
                  less
                </button>
              </>
            )}
          </>
        )}
      </td>
    </tr>
  )
}

function ProjectBoundaryTab({ cs }: { cs: Record<string, unknown> }) {
  const boundary = cs.project_boundary as Record<string, unknown> | undefined

  if (!boundary) {
    return (
      <p className="text-sm text-muted-foreground">
        No project boundary data available.
      </p>
    )
  }

  const baselineScenario = boundary.project_boundary_baseline_scenario as
    | Record<string, unknown>
    | undefined
  const projectScenario = boundary.project_boundary_project_scenario as
    | Record<string, unknown>
    | undefined

  if (!baselineScenario && !projectScenario) {
    return (
      <p className="text-sm text-muted-foreground">
        Project boundary data is present but has an unexpected structure.
      </p>
    )
  }

  const baselineEntries = baselineScenario
    ? parseBoundaryScenario(baselineScenario)
    : []
  const projectEntries = projectScenario
    ? parseBoundaryScenario(projectScenario)
    : []

  return (
    <div className="space-y-8">
      {baselineEntries.length > 0 && (
        <BoundaryScenarioTable
          title="Baseline Scenario"
          entries={baselineEntries}
        />
      )}
      {projectEntries.length > 0 && (
        <BoundaryScenarioTable
          title="Project Scenario"
          entries={projectEntries}
        />
      )}
    </div>
  )
}

// ─── VCU Projections Tab ──────────────────────────────────────────────────────

interface VcuRow {
  calendarYear: number
  seqYear: number
  bsl: number
  wps: number
  leakage: number
  bufferDeduction: number
  reductionVcus: number
  removalVcus: number
  totalVcu: number
}

function VcuProjectionsTab({ cs }: { cs: Record<string, unknown> }) {
  const [yearFilter, setYearFilter] = useState("")

  const instances = cs.project_data_per_instance as
    | { instance_name?: string; project_instance?: Record<string, unknown> }[]
    | undefined
  const projInstance = instances?.[0]?.project_instance as
    | Record<string, unknown>
    | undefined
  const individualParams = projInstance?.individual_parameters as
    | Record<string, unknown>
    | undefined
  const bufferPct =
    ((individualParams?.["individual_params_buffer_%"] as number | undefined) ??
      0.13) * 100

  const baselineEmissions = projInstance?.baseline_emissions as
    | Record<string, unknown>
    | undefined
  const projectEmissions = projInstance?.project_emissions as
    | Record<string, unknown>
    | undefined
  const netErrData = projInstance?.net_ERR as Record<string, unknown> | undefined

  const yearlyBaseline = (
    (baselineEmissions?.yearly_data_for_baseline_GHG_emissions as
      | { year_t: number; GHG_BSL?: number }[]
      | undefined) ?? []
  )

  const yearlyProject = (
    (projectEmissions?.yearly_data_for_project_GHG_emissions as
      | {
          year_t: number
          GHG_WPS?: number
          GHG_WPS_biomass?: number
          GHG_WPS_soil?: number
        }[]
      | undefined) ?? []
  )

  const yearlyNetErr = (
    (netErrData?.net_ERR_calculation_per_year as
      | {
          year_t: number
          NER_t?: number
          adjusted_NER_t?: number
          buffer_deduction?: number
          VCU?: number
          GHG_LK?: number
          NERRWE?: number
          NER_stock_t?: number
        }[]
      | undefined) ?? []
  )

  // Find the first calendar year from baseline data
  const firstCalYear = yearlyBaseline[0]?.year_t ?? 2022

  // Build maps keyed by calendar year (for baseline/project) and seq year (for net_ERR)
  const bslByYear = new Map(yearlyBaseline.map((r) => [r.year_t, r.GHG_BSL ?? 0]))
  const wpsByYear = new Map(yearlyProject.map((r) => [r.year_t, r.GHG_WPS ?? 0]))
  const netErrBySeq = new Map(yearlyNetErr.map((r) => [r.year_t, r]))

  // Build unified row array
  const allRows: VcuRow[] = yearlyBaseline.map((bslRow) => {
    const calYear = bslRow.year_t
    const seqYear = calYear - firstCalYear + 1
    const bsl = bslByYear.get(calYear) ?? 0
    const wps = wpsByYear.get(calYear) ?? 0
    const nerRow = netErrBySeq.get(seqYear)
    const absWps = Math.abs(wps)

    const leakage = nerRow?.GHG_LK ?? 0

    // Use stored policy-engine values if non-zero; otherwise estimate from
    // project emissions (the policy engine hasn't run yet on this project_form VC).
    // `??` alone is insufficient because stored placeholders are 0, not null.
    const storedBuffer = nerRow?.buffer_deduction ?? 0
    const bufferDeduction = storedBuffer !== 0
      ? storedBuffer
      : absWps * (bufferPct / 100)

    const storedNer = nerRow?.NERRWE ?? nerRow?.adjusted_NER_t ?? 0
    const reductionVcus = storedNer !== 0
      ? storedNer
      : absWps > 0 ? absWps - bufferDeduction : 0

    const removalVcus = nerRow?.NER_stock_t ?? 0

    const storedVcu = nerRow?.VCU ?? 0
    const totalVcu = storedVcu !== 0
      ? storedVcu
      : absWps * (1 - bufferPct / 100)

    return {
      calendarYear: calYear,
      seqYear,
      bsl,
      wps,
      leakage,
      bufferDeduction,
      reductionVcus,
      removalVcus,
      totalVcu,
    }
  })

  const filteredRows = useMemo(() => {
    if (!yearFilter) return allRows
    return allRows.filter((r) =>
      String(r.calendarYear).includes(yearFilter.trim())
    )
  }, [allRows, yearFilter])

  // Check if all net_ERR values are zero (projected, not yet calculated by policy)
  const allZeroNetErr = allRows.every((r) => r.totalVcu === 0)

  // Totals
  const totals = allRows.reduce(
    (acc, r) => ({
      bsl: acc.bsl + r.bsl,
      wps: acc.wps + r.wps,
      leakage: acc.leakage + r.leakage,
      bufferDeduction: acc.bufferDeduction + r.bufferDeduction,
      reductionVcus: acc.reductionVcus + r.reductionVcus,
      removalVcus: acc.removalVcus + r.removalVcus,
      totalVcu: acc.totalVcu + r.totalVcu,
    }),
    {
      bsl: 0,
      wps: 0,
      leakage: 0,
      bufferDeduction: 0,
      reductionVcus: 0,
      removalVcus: 0,
      totalVcu: 0,
    }
  )

  if (allRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No VCU projection data available.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Filter by year…"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredRows.length} of {allRows.length} years
          {" · "}Buffer pool: {bufferPct.toFixed(0)}%
        </span>
      </div>

      {allZeroNetErr && (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2">
          Buffer Pool and VCU columns are estimated from project emissions × buffer rate ({bufferPct.toFixed(0)}%).
          Precise per-year calculations (leakage, uncertainty adjustments) are in the companion
          "Calculated Project" VC generated by the policy engine.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                Vintage Period
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Baseline<br />Emissions (tCO₂e)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Project<br />Emissions (tCO₂e)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Leakage<br />(tCO₂e)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Buffer Pool<br />(tCO₂e)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Reduction<br />VCUs
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Removal<br />VCUs
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Est. Total<br />VCU
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr
                key={row.calendarYear}
                className={
                  idx < filteredRows.length - 1
                    ? "border-b hover:bg-muted/30"
                    : "hover:bg-muted/30"
                }
              >
                <td className="px-3 py-1.5 font-medium tabular-nums">
                  {row.calendarYear}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtNum(row.bsl)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtNum(row.wps)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtNum(row.leakage)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtNum(row.bufferDeduction)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtNum(row.reductionVcus)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmtNum(row.removalVcus)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                  {fmtNum(row.totalVcu)}
                </td>
              </tr>
            ))}
          </tbody>
          {!yearFilter && (
            <tfoot>
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="px-3 py-2 text-xs">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.bsl)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.wps)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.leakage)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.bufferDeduction)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.reductionVcus)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.removalVcus)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {fmtNum(totals.totalVcu)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ─── Map Tab ──────────────────────────────────────────────────────────────────

function MapTab({ cs }: { cs: Record<string, unknown> }) {
  const pd = cs.project_details as Record<string, unknown> | undefined
  const geoData = (pd?.G189 as unknown[] | undefined)?.[0] as
    | GeoJsonObject
    | undefined

  if (!geoData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <IconMapPin className="size-8 opacity-40" />
        <p className="text-sm">No geographic boundary data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Project boundary from PDD submission.
      </p>
      <div className="rounded-lg overflow-hidden border" style={{ height: "420px" }}>
        <ProjectBoundaryMap geojson={geoData} />
      </div>
    </div>
  )
}

// ─── Full PDD Tab ─────────────────────────────────────────────────────────────

// Keys shown in dedicated tabs — exclude from the Full PDD browser
const EXCLUDED_PDD_KEYS = new Set([
  "project_boundary",
  "project_data_per_instance",
])

function FullPddTab({ cs }: { cs: Record<string, unknown> }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["top"])
  )

  const sections = useMemo(
    () => buildSections(cs, EXCLUDED_PDD_KEYS),
    [cs]
  )

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search fields by name or value…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {sections.reduce((sum, s) => sum + s.fields.length, 0)} fields across{" "}
        {sections.length} sections
      </p>
      <div className="space-y-2">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main PDDView ─────────────────────────────────────────────────────────────

export function PDDView({ cs, rawDocuments }: PDDViewProps) {
  return (
    <Tabs defaultValue="key">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="key">Key Info</TabsTrigger>
        <TabsTrigger value="boundary">Project Boundary</TabsTrigger>
        <TabsTrigger value="vcu">VCU Projections</TabsTrigger>
        <TabsTrigger value="map">Map</TabsTrigger>
        <TabsTrigger value="pdd">Full PDD</TabsTrigger>
        {rawDocuments && rawDocuments.length > 0 && (
          <TabsTrigger value="raw">Raw VC</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="key" className="pt-4">
        <KeyInfoTab cs={cs} />
      </TabsContent>

      <TabsContent value="boundary" className="pt-4">
        <ProjectBoundaryTab cs={cs} />
      </TabsContent>

      <TabsContent value="vcu" className="pt-4">
        <VcuProjectionsTab cs={cs} />
      </TabsContent>

      <TabsContent value="map" className="pt-4">
        <MapTab cs={cs} />
      </TabsContent>

      <TabsContent value="pdd" className="pt-4">
        <FullPddTab cs={cs} />
      </TabsContent>

      {rawDocuments && rawDocuments.length > 0 && (
        <TabsContent value="raw" className="pt-4">
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96">
            {formatRawVc(rawDocuments[0])}
          </pre>
        </TabsContent>
      )}
    </Tabs>
  )
}
