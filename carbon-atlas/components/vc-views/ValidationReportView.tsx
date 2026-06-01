import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FieldGrid } from "@/components/shared/FieldDisplay"
import { formatRawVc } from "@/lib/utils/format"

interface ValidationReportViewProps {
  cs: Record<string, unknown>
  rawDocuments?: string[]
}

function renderValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (typeof val === "number") return val.toLocaleString("en-US")
  if (typeof val === "string") return val || "—"
  if (Array.isArray(val)) return val.length > 0 ? `${val.length} items` : "—"
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>)
    if (entries.length <= 3) {
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ")
    }
    return `${entries.length} fields`
  }
  return String(val)
}

const SKIP_KEYS = new Set(["type", "@context", "id", "policyId"])

/** Human-readable label from camelCase/snake_case field names */
function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\bfield(\d+)/i, "Field $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ValidationReportView({ cs, rawDocuments }: ValidationReportViewProps) {
  const fields = Object.entries(cs)
    .filter(([k]) => !SKIP_KEYS.has(k))
    .map(([k, v]) => ({ label: humanize(k), value: renderValue(v) }))

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview ({fields.length})</TabsTrigger>
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>
      <TabsContent value="overview" className="pt-4">
        {fields.length > 0 ? (
          <FieldGrid fields={fields} cols={2} />
        ) : (
          <p className="text-muted-foreground text-sm">No fields found in credential subject.</p>
        )}
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
