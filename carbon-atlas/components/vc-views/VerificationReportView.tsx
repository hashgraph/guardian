import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatTCO2e } from "@/lib/utils/format"

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
  const conclusion = cs.conclusion as string | undefined
  const ER_y = get(cs, "emission_reduction.ER_y") as number | undefined

  // GHG summary arrays
  const ghgDuration = cs.verifiedGhgDuration as string[] | undefined
  const ghgBE = cs.verifiedGhgBaselineEmissions as string[] | undefined
  const ghgPE = cs.verifiedGhgProjectEmissions as string[] | undefined
  const ghgER = cs.verifiedGhgEmissionReductions as string[] | undefined

  const overviewFields = [
    { label: "Project Title", value: projectTitle ?? "—" },
    { label: "GS ID", value: gsId != null ? String(gsId) : "—" },
    { label: "Completion Date", value: completionDate ?? "—" },
    { label: "Monitoring Period", value: monitoringPeriod ?? "—" },
    {
      label: "Conclusion",
      value: conclusion ? (
        <span className="text-sm leading-relaxed">{conclusion.length > 200 ? `${conclusion.slice(0, 200)}…` : conclusion}</span>
      ) : "—",
    },
    { label: "Verified Emission Reductions (tCO₂e)", value: ER_y !== undefined ? formatTCO2e(ER_y) : "—" },
  ]

  const ghgFields = [
    { label: "Duration", value: ghgDuration?.[0] ?? "—" },
    { label: "Baseline Emissions", value: ghgBE?.[0] ?? "—" },
    { label: "Project Emissions", value: ghgPE?.[0] ?? "—" },
    { label: "Emission Reductions", value: ghgER?.[0] ?? "—" },
  ]

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ghg">GHG Summary</TabsTrigger>
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="pt-4">
        <FieldGrid fields={overviewFields} cols={2} />
      </TabsContent>

      <TabsContent value="ghg" className="pt-4">
        <FieldGrid fields={ghgFields} cols={2} />
      </TabsContent>

      {rawDocuments && (
        <TabsContent value="raw" className="pt-4">
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap">
            {rawDocuments[0]}
          </pre>
        </TabsContent>
      )}
    </Tabs>
  )
}
