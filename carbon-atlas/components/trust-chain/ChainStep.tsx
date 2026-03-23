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
import { parseCredentialSubject } from "@/lib/api/vc-documents"
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

/** Entity types that benefit from pre-fetching to show document dates in collapsed view */
const PRE_FETCH_ENTITY_TYPES = new Set(["verification_report", "validation_report"])

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj)
}

/** Extract a human-readable subtitle from the VC credential subject based on entity type */
function extractSubtitle(entityType: string, cs: Record<string, unknown>): string | null {
  if (entityType === "verification_report") {
    const version = get(cs, "vvb_vr_key_project_information.verificationReportVersion") as string | undefined
    const date = get(cs, "vvb_vr_key_project_information.verificationReportCompletionDate") as string | undefined
    const parts: string[] = []
    if (version) parts.push(`v${version}`)
    if (date) parts.push(`Completed ${date}`)
    return parts.length > 0 ? parts.join(" · ") : null
  }
  if (entityType === "validation_report") {
    const title = cs.projectTitle as string | undefined
    const gsId = cs.gsid ?? cs.gs_id
    const parts: string[] = []
    if (title) parts.push(title)
    if (gsId != null) parts.push(`GS${gsId}`)
    return parts.length > 0 ? parts.join(" · ") : null
  }
  return null
}

interface ChainStepProps {
  node: ChainNode
  stepNumber: number
  isLast: boolean
}

export function ChainStep({ node, stepNumber, isLast }: ChainStepProps) {
  const [expanded, setExpanded] = React.useState(false)

  // Pre-fetch for certain entity types to show document dates in collapsed view
  const shouldPreFetch = PRE_FETCH_ENTITY_TYPES.has(node.entityType)
  const [fetched, setFetched] = React.useState(shouldPreFetch)

  const { data: vcDetail, isLoading } = useVcDocument(
    fetched ? node.vc.consensusTimestamp : undefined
  )

  const subtitle = React.useMemo(() => {
    if (!vcDetail) return null
    const cs = parseCredentialSubject<Record<string, unknown>>(vcDetail)
    if (!cs) return null
    return extractSubtitle(node.entityType, cs)
  }, [vcDetail, node.entityType])

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
              {subtitle ?? formatTimestampFull(node.vc.consensusTimestamp)}
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
