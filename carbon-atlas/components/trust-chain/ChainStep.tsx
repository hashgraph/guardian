"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronRight,
  IconLoader,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { VCRenderer } from "@/components/vc-views/VCRenderer"
import { useVcDocument } from "@/hooks/useVcDocument"
import type { ChainNode } from "@/lib/utils/trust-chain"
import { formatTimestampFull } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

const colorMap: Record<string, string> = {
  teal: "border-teal-300 bg-teal-50 text-teal-800",
  blue: "border-blue-300 bg-blue-50 text-blue-800",
  indigo: "border-indigo-300 bg-indigo-50 text-indigo-800",
  violet: "border-violet-300 bg-violet-50 text-violet-800",
  green: "border-green-300 bg-green-50 text-green-800",
  amber: "border-amber-300 bg-amber-50 text-amber-800",
  orange: "border-orange-300 bg-orange-50 text-orange-800",
  sky: "border-sky-300 bg-sky-50 text-sky-800",
  slate: "border-slate-300 bg-slate-50 text-slate-800",
}

interface ChainStepProps {
  node: ChainNode
  stepNumber: number
  isLast: boolean
}

export function ChainStep({ node, stepNumber, isLast }: ChainStepProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [fetched, setFetched] = React.useState(false)

  const { data: vcDetail, isLoading } = useVcDocument(
    fetched ? node.vc.consensusTimestamp : undefined
  )

  function handleExpand() {
    if (!expanded && !fetched) setFetched(true)
    setExpanded((v) => !v)
  }

  const badgeClass =
    colorMap[node.config.color] ?? "border-slate-300 bg-slate-50 text-slate-800"

  return (
    <div className="flex gap-3">
      {/* Numbered step circle + connector line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "size-6 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center text-[10px] font-semibold",
            `border-${node.config.color}-500 bg-${node.config.color}-100 text-${node.config.color}-700`
          )}
        >
          {stepNumber}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="rounded-lg border overflow-hidden">
          <button
            onClick={handleExpand}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
          >
            <Badge variant="outline" className={cn("text-xs shrink-0", badgeClass)}>
              {node.config.label}
            </Badge>
            <span className="text-xs text-muted-foreground flex-1 truncate">
              {formatTimestampFull(node.vc.consensusTimestamp)}
            </span>
            <HederaProofBadge
              consensusTimestamp={node.vc.consensusTimestamp}
              className="shrink-0"
            />
            {expanded ? (
              <IconChevronDown className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <IconChevronRight className="size-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {/* Expanded VC detail */}
          {expanded && (
            <div className="border-t px-4 py-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <IconLoader className="size-4 animate-spin" />
                  Loading VC detail…
                </div>
              ) : vcDetail ? (
                <VCRenderer vcDetail={vcDetail} entityTypeOverride={node.entityType} />
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm font-medium">Document not found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The VC document for this step could not be loaded from the indexer.
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-2">
                    {node.vc.consensusTimestamp}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
