import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatTCO2e, formatRawVc } from "@/lib/utils/format"

interface VerificationReportViewProps {
  cs: Record<string, unknown>
  rawDocuments?: string[]
}

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj)
}

export function VerificationReportView({ cs, rawDocuments }: VerificationReportViewProps) {
  const projectTitle = get(cs, "vvb_vr_key_project_information.projectTitle") as string | undefined
  const gsId = (cs.gs_id ?? get(cs, "vvb_vr_key_project_information.gsId")) as string | undefined
  const completionDate = get(cs, "vvb_vr_key_project_information.verificationReportCompletionDate") as string | undefined
  const monitoringPeriod = get(cs, "vvb_vr_key_project_information.monitoringPeriodNumberAndDuration") as string | undefined
  const reportVersion = get(cs, "vvb_vr_key_project_information.verificationReportVersion") as string | undefined
  const amountsAchieved = get(cs, "vvb_vr_key_project_information.amountsAchieved") as string | undefined
  const conclusion = cs.conclusion as string | undefined
  const ER_y = get(cs, "emission_reduction.ER_y") as number | undefined

  const overviewFields = [
    { label: "Project Title", value: projectTitle ?? "—" },
    { label: "GS ID", value: gsId != null ? String(gsId) : "—" },
    { label: "Report Version", value: reportVersion ?? "—" },
    { label: "Completion Date", value: completionDate ?? "—" },
    { label: "Monitoring Period", value: monitoringPeriod ?? "—" },
    { label: "Verified Emission Reductions (tCO₂e)", value: ER_y !== undefined ? formatTCO2e(ER_y) : "—" },
  ]

  // GHG Summary: show monitoring period, verified ER, and the full conclusion
  const ghgFields = [
    { label: "Monitoring Period", value: monitoringPeriod ?? "—" },
    { label: "Verified Emission Reductions", value: ER_y !== undefined ? formatTCO2e(ER_y) : (amountsAchieved ? `${Number(amountsAchieved).toLocaleString("en-US")} tCO₂e` : "—") },
  ]

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ghg">GHG Summary</TabsTrigger>
        {conclusion && <TabsTrigger value="conclusion">Conclusion</TabsTrigger>}
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="pt-4">
        <FieldGrid fields={overviewFields} cols={2} />
      </TabsContent>

      <TabsContent value="ghg" className="pt-4 space-y-4">
        {/* Hero stat for verified ER */}
        <div className="rounded-xl border bg-gradient-to-b from-primary/5 to-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Verified Emission Reductions</p>
          <p className="text-4xl font-bold tabular-nums mt-1">
            {ER_y !== undefined ? Number(ER_y).toLocaleString("en-US", { maximumFractionDigits: 2 }) : (amountsAchieved ?? "—")}
          </p>
          <p className="text-muted-foreground text-sm mt-1">tCO₂e</p>
        </div>

        <FieldGrid fields={ghgFields} cols={2} />

        <p className="text-xs text-muted-foreground leading-relaxed">
          The verification report confirms the emission reductions calculated in the monitoring report. Baseline and project emission breakdowns are available in the corresponding Monitoring Report VC.
        </p>
      </TabsContent>

      {conclusion && (
        <TabsContent value="conclusion" className="pt-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{conclusion}</p>
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
