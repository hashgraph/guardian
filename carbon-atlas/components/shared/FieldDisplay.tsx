import * as React from "react"
import { cn } from "@/lib/utils"

interface FieldDisplayProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function FieldDisplay({ label, value, className }: FieldDisplayProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  )
}

interface FieldGridProps {
  fields: { label: string; value: React.ReactNode }[]
  cols?: 2 | 3 | 4
  className?: string
}

export function FieldGrid({ fields, cols = 2, className }: FieldGridProps) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[cols]

  return (
    <div className={cn("grid gap-4", colClass, className)}>
      {fields.map((f) => (
        <FieldDisplay key={f.label} label={f.label} value={f.value} />
      ))}
    </div>
  )
}
