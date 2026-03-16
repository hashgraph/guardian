import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatRawVc } from "@/lib/utils/format"

interface ValidationReportViewProps {
  cs: Record<string, unknown>
  rawDocuments?: string[]
}

export function ValidationReportView({ cs, rawDocuments }: ValidationReportViewProps) {
  const keyFields = [
    { label: "Project Title", value: (cs.projectTitle as string) ?? "—" },
    { label: "GS ID", value: cs.gs_id != null ? String(cs.gs_id) : "—" },
    { label: "Standard", value: (cs.field0 as string) ?? "—" },
  ]

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>
      <TabsContent value="overview" className="pt-4">
        <FieldGrid fields={keyFields} cols={2} />
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
