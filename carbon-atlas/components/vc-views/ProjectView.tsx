import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatTCO2e, formatRawVc } from "@/lib/utils/format"

interface ProjectViewProps {
  cs: Record<string, unknown>
  entityType: string
  rawDocuments?: string[]
}

/** Safely traverse nested path like "project_details.field0" */
function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj)
}

function fmt(val: unknown, unit?: string): string {
  if (val === undefined || val === null) return "—"
  const n = Number(val)
  if (isNaN(n)) return String(val)
  const s = n.toLocaleString("en-US", { maximumFractionDigits: 4 })
  return unit ? `${s} ${unit}` : s
}

/** Extract primary fuel params from baseline_emission_case_common_values array (mainnet structure) */
function getPrimaryFuelParam(cs: Record<string, unknown>, field: string): unknown {
  const cv = get(cs, "case2.baseline_emission_case_common_values") ?? get(cs, "case1.baseline_emission_case_common_values")
  if (!Array.isArray(cv) || cv.length === 0) return undefined
  // Use highest proportion_of_cooking_fuel entry as primary
  const sorted = [...cv].sort((a, b) => (b.proportion_of_cooking_fuel ?? 0) - (a.proportion_of_cooking_fuel ?? 0))
  return sorted[0]?.[field]
}

interface Assumption {
  label: string
  value: string
  description: string
}

export function ProjectView({ cs, entityType, rawDocuments }: ProjectViewProps) {
  const status = entityType === "approved_project" ? "Validated" : "New"

  const rawProjectName = get(cs, "project_details.field0")
  const projectName = typeof rawProjectName === "string" ? rawProjectName
    : typeof rawProjectName === "object" && rawProjectName !== null ? (rawProjectName as Record<string, unknown>).name as string ?? JSON.stringify(rawProjectName)
    : rawProjectName != null ? String(rawProjectName) : undefined
  const country = get(cs, "project_details.field12") as string | undefined
  const methodology = get(cs, "project_details.field19") as string | undefined
  const rawCrediting = get(cs, "project_details.field28")
  const creditingFrom = typeof rawCrediting === "object" && rawCrediting !== null
    ? (rawCrediting as Record<string, unknown>).from as string | undefined
    : undefined
  const creditingTo = typeof rawCrediting === "object" && rawCrediting !== null
    ? (rawCrediting as Record<string, unknown>).to as string | undefined
    : undefined
  const caseType = cs.baseline_emission_case as string | undefined
  const ER_y = get(cs, "emission_reduction.ER_y") as number | undefined
  const BE_y = get(cs, "case2.BE_y") ?? get(cs, "case1.BE_y")
  const PE_y = get(cs, "project_emission_electricity.PE_y") ?? get(cs, "case1.PE_y")
  const LE_y = get(cs, "leakage_emission.LE_y")
  const EFb_input = get(cs, "case2.EFb_input") ?? get(cs, "case1.EFb_input")
  const projectTech = get(cs, "baseline_emission_tech.project_technology") as string | undefined
  const rawDescription = get(cs, "project_details.field7")
  const description = typeof rawDescription === "string" ? rawDescription
    : typeof rawDescription === "object" && rawDescription !== null ? undefined
    : rawDescription != null ? String(rawDescription) : undefined

  // Additional methodology parameters (with fallback to per-fuel common values on mainnet)
  const fNRB = get(cs, "case2.fNRB") ?? get(cs, "case1.fNRB") ?? get(cs, "fNRB")
    ?? getPrimaryFuelParam(cs, "nonRenewabilityStatusWoodyBiomass_fNRBi_y")
  const NCVb = get(cs, "case2.NCV_b") ?? get(cs, "case1.NCV_b") ?? get(cs, "NCV_b")
    ?? getPrimaryFuelParam(cs, "netCalorificValueTJPerTonne_NCVb_fuel")
  const EF_CO2 = get(cs, "case2.EF_CO2") ?? get(cs, "case1.EF_CO2") ?? get(cs, "EF_CO2")
    ?? getPrimaryFuelParam(cs, "co2EmissionFactorTco2PerTJ_EFb_fuel")
  const leakageRate = get(cs, "leakage_emission.leakage_rate") ?? get(cs, "leakage_rate")

  const keyFields = [
    { label: "Project Name", value: projectName ?? "—" },
    {
      label: "Country",
      value: country ? (
        <Badge variant="outline">{country}</Badge>
      ) : "—",
    },
    { label: "Status", value: (
      <Badge
        variant="outline"
        className={
          status === "Validated"
            ? "text-green-700 border-green-300 bg-green-50"
            : "text-muted-foreground"
        }
      >
        {status}
      </Badge>
    )},
    { label: "Methodology", value: methodology ?? "—" },
    { label: "Case Type", value: caseType ?? "—" },
    { label: "Project Technology", value: projectTech ?? "—" },
    { label: "Crediting Period Start", value: creditingFrom ?? "—" },
    { label: "Crediting Period End", value: creditingTo ?? "—" },
    { label: "Projected Emission Reductions", value: ER_y !== undefined ? formatTCO2e(ER_y) : "—" },
  ]

  const emissionFields = [
    { label: "Baseline Emissions", value: BE_y !== undefined ? formatTCO2e(BE_y as number) : "—" },
    { label: "Project Emissions", value: PE_y !== undefined ? formatTCO2e(PE_y as number) : "—" },
    { label: "Leakage Emissions", value: LE_y !== undefined ? formatTCO2e(LE_y as number) : "—" },
    { label: "Baseline Emission Factor", value: EFb_input !== undefined ? String(EFb_input) : "—" },
  ]

  const assumptions: Assumption[] = [
    {
      label: "Baseline Emission Factor (EFb)",
      value: fmt(EFb_input, "tCO₂/TJ"),
      description: "CO₂ emission factor for the baseline cooking fuel. Represents the amount of greenhouse gas emitted per unit of energy from traditional biomass fuels.",
    },
    {
      label: "Fraction of Non-Renewable Biomass (fNRB)",
      value: fmt(fNRB),
      description: "The share of biomass fuel harvested in a non-renewable manner. A higher fNRB means more of the traditional fuel use contributes to net CO₂ emissions, since renewably harvested biomass is considered carbon-neutral.",
    },
    {
      label: "Projected Leakage Emissions",
      value: formatTCO2e(LE_y as number),
      description: "Indirect emissions caused outside the project boundary as a result of the project activity — for example, displaced use of traditional fuels in other areas.",
    },
    {
      label: "Net Calorific Value (NCVb)",
      value: fmt(NCVb, "TJ/kt"),
      description: "Energy content of the baseline fuel per unit mass. Used to convert fuel consumption into energy terms for emission calculations.",
    },
    {
      label: "CO₂ Emission Factor of Fuel (EF_CO2)",
      value: fmt(EF_CO2, "tCO₂/TJ"),
      description: "IPCC default emission factor for the CO₂ content of the baseline fuel type.",
    },
    {
      label: "Leakage Rate",
      value: fmt(leakageRate, "%"),
      description: "Percentage of emission reductions estimated to be offset by leakage effects.",
    },
    {
      label: "Calculation Case",
      value: caseType ?? "—",
      description: caseType?.includes("2")
        ? "CASE 2 uses metered energy data from EPC (Electric Pressure Cooker) devices with specific energy consumption per person to determine baseline and project emissions."
        : "Determines how baseline and project emissions are calculated under the MECD methodology.",
    },
    {
      label: "Project Technology",
      value: projectTech ?? "—",
      description: "The type of cooking technology being deployed to replace traditional biomass cooking. This determines project emission factors and energy efficiency assumptions.",
    },
  ]

  const shownAssumptions = assumptions.filter(
    (a) => a.value !== "—" || a.label === "Projected Leakage Emissions" || a.label === "Calculation Case"
  )

  return (
    <Tabs defaultValue="key">
      <TabsList>
        <TabsTrigger value="key">Key Info</TabsTrigger>
        <TabsTrigger value="emissions">Emission Params</TabsTrigger>
        <TabsTrigger value="assumptions">Key Assumptions</TabsTrigger>
        {description && <TabsTrigger value="description">Description</TabsTrigger>}
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>

      <TabsContent value="key" className="pt-4">
        <FieldGrid fields={keyFields} cols={2} />
      </TabsContent>

      <TabsContent value="emissions" className="pt-4">
        <FieldGrid fields={emissionFields} cols={2} />
      </TabsContent>

      <TabsContent value="assumptions" className="pt-4 space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          Key parameters and assumptions from the Project Design Document. These values are defined by the Gold Standard MECD 431 methodology and validated by the VVB before the crediting period begins.
        </p>
        <div className="space-y-3">
          {shownAssumptions.map((a) => (
            <div key={a.label} className="rounded-lg border p-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">{a.label}</span>
                <span className="text-sm font-semibold tabular-nums whitespace-nowrap">{a.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      {description && (
        <TabsContent value="description" className="pt-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
        </TabsContent>
      )}

      {rawDocuments && (
        <TabsContent value="raw" className="pt-4">
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96">
            {formatRawVc(rawDocuments[0])}
          </pre>
        </TabsContent>
      )}
    </Tabs>
  )
}
