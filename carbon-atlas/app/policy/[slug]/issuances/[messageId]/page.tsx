"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconLoader } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { TrustChainView } from "@/components/trust-chain/TrustChainView"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { useVcDocument } from "@/hooks/useVcDocument"
import { formatTimestamp } from "@/lib/utils/format"
import { ProjectDeveloperBadge } from "@/components/shared/ProjectDeveloperBadge"
import { CopyableId } from "@/components/shared/CopyableId"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

export default function IssuanceDetailPage() {
  const { policy } = usePolicyNetwork()
  const params = useParams<{ messageId: string }>()
  const vcId = params.messageId
  const { data: vcDetail, isLoading, error } = useVcDocument(vcId)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/policy/${policy.slug}/issuances`}>
            <IconArrowLeft className="size-4 mr-1" />
            Issuances
          </Link>
        </Button>
        {vcDetail?.item && (
          <HederaProofBadge
            consensusTimestamp={vcDetail.item.consensusTimestamp}
          />
        )}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Trust Chain</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Verifiable audit trail from approved monitoring report through to project origin
            {vcDetail?.item
              ? ` · ${formatTimestamp(vcDetail.item.consensusTimestamp)}`
              : ""}
          </p>
          <div className="mt-1">
            <CopyableId value={vcId} className="break-all" />
          </div>
          {vcDetail?.item?.options?.issuer && (
            <div className="mt-1">
              <CopyableId label="Issuer" value={vcDetail.item.options.issuer} className="break-all" />
            </div>
          )}
        </div>
        <ProjectDeveloperBadge className="hidden sm:flex" />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <IconLoader className="size-5 animate-spin" />
          Loading…
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">Error: {error.message}</p>
      )}

      <TrustChainView rootVcId={vcId} />
    </div>
  )
}
