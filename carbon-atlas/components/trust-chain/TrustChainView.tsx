"use client"

import * as React from "react"
import { IconClock, IconLoader, IconUserCheck } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { ChainStep } from "./ChainStep"
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import { buildChain } from "@/lib/utils/trust-chain"

interface TrustChainViewProps {
  rootVcId: string
}

/** Small inline annotation between steps (e.g. "VVB Assigned") */
function VVBChip({ label }: { label: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-2 bg-border" />
        <IconUserCheck className="size-4 text-muted-foreground shrink-0" />
        <div className="w-0.5 h-2 bg-border" />
      </div>
      <div className="flex items-center pb-0 py-1">
        <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal border-dashed">
          {label}
        </Badge>
      </div>
    </div>
  )
}

/** Ghost step for a pending lifecycle event (e.g. Token Minting) */
function GhostStep({ stepNumber }: { stepNumber: number }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="size-6 rounded-full border-2 border-dashed border-muted-foreground/40 mt-0.5 shrink-0 flex items-center justify-center text-[10px] font-semibold text-muted-foreground/60">
          {stepNumber}
        </div>
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="rounded-lg border border-dashed overflow-hidden opacity-60">
          <div className="flex items-center gap-3 px-4 py-3">
            <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">
              Token Minting
            </Badge>
            <span className="text-xs text-muted-foreground flex-1">
              Pending — will occur after verification is approved
            </span>
            <IconClock className="size-4 text-muted-foreground shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrustChainView({ rootVcId }: TrustChainViewProps) {
  const { data: allVcs, isLoading, error } = useAllPolicyVcs()

  const chain = React.useMemo(() => {
    if (!allVcs) return []
    return buildChain(allVcs, rootVcId)
  }, [allVcs, rootVcId])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <IconLoader className="size-5 animate-spin" />
        Loading trust chain…
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-4">
        Error loading trust chain: {error.message}
      </p>
    )
  }

  if (chain.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No chain nodes found for this issuance.
      </p>
    )
  }

  // Total step count includes the ghost "Token Minting" node
  const totalSteps = chain.length + 1

  return (
    <div className="space-y-0">
      <p className="text-xs text-muted-foreground mb-4">
        {totalSteps} steps in lifecycle · Newest first (top) to oldest (bottom) · Click any step to expand VC details
      </p>

      {/* Ghost: Token Minting (pending) */}
      <GhostStep stepNumber={totalSteps} />

      {chain.map((node, i) => {
        // Step number counts down from totalSteps-1 (first real node) to 1 (oldest)
        const stepNumber = totalSteps - 1 - i
        const isLast = i === chain.length - 1

        return (
          <React.Fragment key={node.vc.consensusTimestamp}>
            <ChainStep node={node} stepNumber={stepNumber} isLast={isLast} />
            {/* VVB assignment annotation — shown below the report (older in time) */}
            {node.entityType === "verification_report" && (
              <VVBChip label="VVB Assigned for Verification" />
            )}
            {node.entityType === "validation_report" && (
              <VVBChip label="VVB Assigned for Validation" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
