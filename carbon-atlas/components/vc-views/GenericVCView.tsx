import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatRawVc } from "@/lib/utils/format"

interface GenericVCViewProps {
  credentialSubject: Record<string, unknown>
  rawDocuments?: string[]
}

function renderValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) return "—"
  if (typeof val === "object") return JSON.stringify(val).slice(0, 80) + "…"
  return String(val)
}

export function GenericVCView({ credentialSubject, rawDocuments }: GenericVCViewProps) {
  const fields = Object.entries(credentialSubject)
    .filter(([k]) => k !== "type" && k !== "@context")
    .map(([k, v]) => ({ label: k, value: renderValue(v) }))

  return (
    <Tabs defaultValue="fields">
      <TabsList>
        <TabsTrigger value="fields">Fields</TabsTrigger>
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>
      <TabsContent value="fields" className="pt-4">
        <FieldGrid fields={fields} cols={2} />
      </TabsContent>
      {rawDocuments && (
        <TabsContent value="raw" className="pt-4">
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96">
            {rawDocuments[0] ? formatRawVc(rawDocuments[0]) : "No document"}
          </pre>
        </TabsContent>
      )}
    </Tabs>
  )
}
