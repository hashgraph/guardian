"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconLoader } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DeviceDataView } from "@/components/vc-views/DeviceDataView"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { useVcDocument } from "@/hooks/useVcDocument"
import { parseCredentialSubject } from "@/lib/api/vc-documents"
import { formatTimestamp } from "@/lib/utils/format"

export default function DevicesPage() {
  const params = useParams<{ messageId: string }>()
  const vcId = params.messageId

  const { data: vcDetail, isLoading, error } = useVcDocument(vcId)
  const cs = vcDetail ? parseCredentialSubject(vcDetail) : null

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/issuances">
              <IconArrowLeft className="size-4 mr-1" />
              Issuances
            </Link>
          </Button>
          {vcDetail && (
            <HederaProofBadge
              consensusTimestamp={vcDetail.item.consensusTimestamp}
            />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Device MRV Data</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Daily metered energy data per cooking device
            {vcDetail
              ? ` · ${formatTimestamp(vcDetail.item.consensusTimestamp)}`
              : ""}
          </p>
          <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
            {vcId}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <IconLoader className="size-5 animate-spin" />
            Loading device data…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">Error: {error.message}</p>
        )}
        {vcDetail && cs && (
          <DeviceDataView
            credentialSubject={cs as Record<string, unknown>}
            rawDocuments={vcDetail.item.documents}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
