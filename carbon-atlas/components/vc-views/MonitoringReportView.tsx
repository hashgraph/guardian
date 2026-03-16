import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatTCO2e, formatRawVc } from "@/lib/utils/format"

interface MonitoringReportViewProps {
  cs: Record<string, unknown>
  rawDocuments?: string[]
}

/** Safely traverse nested path like "emission_reduction.ER_y" */
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

interface Assumption {
  label: string
  value: string
  description: string
}

export function MonitoringReportView({ cs, rawDocuments }: MonitoringReportViewProps) {
  const ER_y = get(cs, "emission_reduction.ER_y") as number | undefined
  const BE_y = get(cs, "case2.BE_y") ?? get(cs, "case1.BE_y")
  const PE_y = get(cs, "project_emission_electricity.PE_y") ?? get(cs, "case1.PE_y")
  const LE_y = get(cs, "leakage_emission.LE_y")
  const periodFrom = get(cs, "monitoring_period.from") as string | undefined
  const periodTo = get(cs, "monitoring_period.to") as string | undefined
  const caseType = cs.baseline_emission_case as string | undefined
  const projectTech = get(cs, "baseline_emission_tech.project_technology") as string | undefined
  const projectFuel = cs.project_fuel as string | undefined
  const numDevices = get(cs, "project_emission_electricity.total_usage.number_of_devices")
  const egPdY = get(cs, "case2.EGp_d_y") ?? get(cs, "project_emission_electricity.total_usage.eg_p_d_y")

  // Key methodology parameters
  const EFb = get(cs, "case2.EFb_input") ?? get(cs, "case1.EFb_input")
  const fNRB = get(cs, "case2.fNRB") ?? get(cs, "case1.fNRB") ?? get(cs, "fNRB")
  const NCVb = get(cs, "case2.NCV_b") ?? get(cs, "case1.NCV_b") ?? get(cs, "NCV_b")
  const EF_CO2 = get(cs, "case2.EF_CO2") ?? get(cs, "case1.EF_CO2") ?? get(cs, "EF_CO2")
  const leakageRate = get(cs, "leakage_emission.leakage_rate") ?? get(cs, "leakage_rate")

  const emissionFields = [
    { label: "Baseline Emissions", value: formatTCO2e(BE_y as number) },
    { label: "Project Emissions", value: formatTCO2e(PE_y as number) },
    { label: "Leakage Emissions", value: formatTCO2e(LE_y as number) },
    { label: "Emission Reductions", value: formatTCO2e(ER_y as number) },
  ]

  const detailFields = [
    { label: "Case Type", value: caseType ?? "—" },
    { label: "Project Technology", value: projectTech ?? "—" },
    { label: "Project Fuel", value: projectFuel ?? "—" },
    { label: "Devices", value: numDevices != null ? String(numDevices) : "—" },
    { label: "Total Energy Consumed", value: egPdY != null ? `${Number(egPdY).toLocaleString("en-US", { maximumFractionDigits: 2 })} kWh` : "—" },
  ]

  const assumptions: Assumption[] = [
    {
      label: "Baseline Emission Factor (EFb)",
      value: fmt(EFb, "tCO₂/TJ"),
      description: "CO₂ emission factor for the baseline cooking fuel. Represents the amount of greenhouse gas emitted per unit of energy from traditional biomass fuels.",
    },
    {
      label: "Fraction of Non-Renewable Biomass (fNRB)",
      value: fmt(fNRB),
      description: "The share of biomass fuel harvested in a non-renewable manner. A higher fNRB means more of the traditional fuel use contributes to net CO₂ emissions, since renewably harvested biomass is considered carbon-neutral.",
    },
    {
      label: "Leakage Emissions",
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
  ]

  // Filter out assumptions where the value is "—" to avoid showing empty params
  const availableAssumptions = assumptions.filter((a) => a.value !== "—")
  // Always show leakage & case type even if value is "—" since they're important context
  const shownAssumptions = assumptions.filter(
    (a) => a.value !== "—" || a.label === "Leakage Emissions" || a.label === "Calculation Case"
  )

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="assumptions">Key Assumptions</TabsTrigger>
        <TabsTrigger value="detail">All Fields</TabsTrigger>
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="pt-4 space-y-4">
        {/* ER_y hero stat */}
        <div className="rounded-xl border bg-gradient-to-b from-primary/5 to-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Emission Reductions</p>
          <p className="text-4xl font-bold tabular-nums mt-1">
            {ER_y !== undefined ? Number(ER_y).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
          </p>
          <p className="text-muted-foreground text-sm mt-1">tCO₂e</p>
        </div>

        {/* Period */}
        <FieldGrid
          fields={[
            { label: "Monitoring Period Start", value: periodFrom ?? "—" },
            { label: "Monitoring Period End", value: periodTo ?? "—" },
          ]}
          cols={2}
        />

        {/* Emission breakdown cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {emissionFields.map((f) => (
            <Card key={f.label} className="text-center">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {f.label.split(" ")[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-base font-semibold">{f.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="assumptions" className="pt-4 space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          Key parameters and assumptions used in the MECD emission reduction calculation. These values are defined by the Gold Standard MECD 431 methodology and verified by the VVB.
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

      <TabsContent value="detail" className="pt-4">
        <FieldGrid fields={[...emissionFields, ...detailFields]} cols={2} />
      </TabsContent>

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
