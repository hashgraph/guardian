"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronRight,
  IconLoader,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { VCRenderer } from "@/components/vc-views/VCRenderer"
import { useVcDocument } from "@/hooks/useVcDocument"
import type { ChainNode } from "@/lib/utils/trust-chain"
import { formatTimestamp } from "@/lib/utils/format"
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
  index: number
  total: number
}

export function ChainStep({ node, index, total }: ChainStepProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [fetched, setFetched] = React.useState(false)

  // Use consensusTimestamp — that's what the indexer API expects as path param
  const { data: vcDetail, isLoading } = useVcDocument(
    fetched ? node.vc.consensusTimestamp : undefined
  )

  function handleExpand() {
    if (!expanded && !fetched) setFetched(true)
    setExpanded((v) => !v)
  }

  const badgeClass =
    colorMap[node.config.color] ?? "border-slate-300 bg-slate-50 text-slate-800"
  const isLast = index === total - 1

  return (
    <div className="flex gap-3">
      {/* Vertical connector line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "size-3 rounded-full border-2 mt-1 shrink-0",
            `border-${node.config.color}-500 bg-${node.config.color}-100`
          )}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="rounded-lg border overflow-hidden">
          {/* Step header */}
          <button
            onClick={handleExpand}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
          >
            <Badge variant="outline" className={cn("text-xs shrink-0", badgeClass)}>
              {node.config.label}
            </Badge>
            <span className="text-xs text-muted-foreground flex-1 truncate font-mono">
              {node.vc.consensusTimestamp}
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

          {/* Expanded content */}
          {expanded && (
            <div className="border-t px-4 py-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <IconLoader className="size-4 animate-spin" />
                  Loading VC detail…
                </div>
              ) : vcDetail ? (
                <VCRenderer vcDetail={vcDetail} />
              ) : (
                <p className="text-sm text-muted-foreground">Failed to load VC detail.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
