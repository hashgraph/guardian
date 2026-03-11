"use client"

import * as React from "react"
import { IconLoader } from "@tabler/icons-react"
import { ChainStep } from "./ChainStep"
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import { buildChain } from "@/lib/utils/trust-chain"

interface TrustChainViewProps {
  rootVcId: string
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

  return (
    <div className="space-y-0">
      <p className="text-xs text-muted-foreground mb-4">
        {chain.length} nodes in chain · Click any step to expand VC details
      </p>
      {chain.map((node, i) => (
        <ChainStep key={node.vc.id} node={node} index={i} total={chain.length} />
      ))}
    </div>
  )
}
