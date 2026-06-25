"use client"

import * as React from "react"
import { IconCopy, IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface CopyableIdProps {
  /** Optional label like "Issuer" shown before the value */
  label?: string
  value: string
  className?: string
}

export function CopyableId({ label, value, className }: CopyableIdProps) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs text-muted-foreground max-w-full",
        className
      )}
    >
      {label && <span className="shrink-0">{label}:&nbsp;</span>}
      <span className="truncate" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
        aria-label={`Copy ${label ?? "ID"}`}
      >
        {copied ? (
          <IconCheck className="size-3.5 text-green-500" />
        ) : (
          <IconCopy className="size-3.5 text-muted-foreground hover:text-foreground" />
        )}
      </button>
    </span>
  )
}
