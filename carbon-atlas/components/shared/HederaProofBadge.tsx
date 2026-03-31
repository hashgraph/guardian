"use client"

import { IconExternalLink, IconShieldCheck } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { hederaExplorerUrl } from "@/lib/utils/hedera"
import { formatTimestamp } from "@/lib/utils/format"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

interface HederaProofBadgeProps {
  consensusTimestamp: string
  className?: string
}

export function HederaProofBadge({ consensusTimestamp, className }: HederaProofBadgeProps) {
  const { network } = usePolicyNetwork()
  const url = hederaExplorerUrl(consensusTimestamp, network)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <Badge
        variant="outline"
        className="gap-1 text-xs font-normal hover:bg-muted cursor-pointer"
      >
        <IconShieldCheck className="size-3 text-green-600" />
        Hedera · {formatTimestamp(consensusTimestamp)}
        <IconExternalLink className="size-3" />
      </Badge>
    </a>
  )
}
