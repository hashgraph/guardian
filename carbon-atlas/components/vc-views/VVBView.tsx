import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { FieldGrid } from "@/components/shared/FieldDisplay"

interface VVBViewProps {
  cs: Record<string, unknown>
  entityType: string
}

export function VVBView({ cs, entityType }: VVBViewProps) {
  const approved = entityType === "approved_vvb"

  const fields = [
    { label: "Role", value: (cs.field0 as string) ?? "—" },
    {
      label: "Status",
      value: (
        <Badge
          variant="outline"
          className={
            approved
              ? "text-green-700 border-green-300 bg-green-50"
              : "text-muted-foreground"
          }
        >
          {approved ? "Approved" : "Registered"}
        </Badge>
      ),
    },
    { label: "DID", value: (cs.id as string) ?? "—" },
    { label: "Guardian Version", value: (cs.guardianVersion as string) ?? "—" },
  ]

  return <FieldGrid fields={fields} cols={2} />
}
