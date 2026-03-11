"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconLoader } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VCRenderer } from "@/components/vc-views/VCRenderer"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { useVcDocument } from "@/hooks/useVcDocument"
import { ENTITY_TYPE_CONFIG } from "@/lib/utils/trust-chain"
import { formatTimestamp } from "@/lib/utils/format"
import type { EntityType } from "@/lib/types/indexer"

export default function DocumentDetailPage() {
  const params = useParams<{ messageId: string }>()
  const vcId = params.messageId

  const { data: vcDetail, isLoading, error } = useVcDocument(vcId)

  const entityType = vcDetail?.item.options?.entityType as EntityType | undefined
  const config = entityType ? ENTITY_TYPE_CONFIG[entityType] : null

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => history.back()}>
            <IconArrowLeft className="size-4 mr-1" />
            Back
          </Button>
          {vcDetail && (
            <HederaProofBadge
              consensusTimestamp={vcDetail.item.consensusTimestamp}
            />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            {config?.label ?? "VC Document"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {vcDetail
              ? `${entityType} · ${formatTimestamp(vcDetail.item.consensusTimestamp)}`
              : ""}
          </p>
          <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
            {vcId}
          </p>
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
        {vcDetail && <VCRenderer vcDetail={vcDetail} />}
      </div>
    </DashboardLayout>
  )
}
