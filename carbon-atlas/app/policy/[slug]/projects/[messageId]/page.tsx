"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconLoader } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { VCRenderer } from "@/components/vc-views/VCRenderer"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { ProjectLifecycleTimeline } from "@/components/shared/ProjectLifecycleTimeline"
import { useVcDocument } from "@/hooks/useVcDocument"
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import { ENTITY_TYPE_CONFIG } from "@/lib/utils/trust-chain"
import { formatTimestamp } from "@/lib/utils/format"
import { ProjectDeveloperBadge } from "@/components/shared/ProjectDeveloperBadge"
import { CopyableId } from "@/components/shared/CopyableId"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"
import type { EntityType } from "@/lib/types/indexer"

/** Entity types that represent a "project" stage in the lifecycle */
const PROJECT_ENTITY_TYPES = new Set<EntityType>([
  "project_form",
  "project",
  "validation_report",
  "approved_project",
])

export default function ProjectDetailPage() {
  const { policy } = usePolicyNetwork()
  const params = useParams<{ messageId: string }>()
  const vcId = params.messageId
  const { data: vcDetail, isLoading, error } = useVcDocument(vcId)
  const { data: allVcs } = useAllPolicyVcs()

  const entityType = React.useMemo(() => {
    const fromDetail = vcDetail?.item?.options?.entityType as EntityType | undefined
    if (fromDetail) return fromDetail
    if (!allVcs) return undefined
    const match = allVcs.find((vc) => vc.consensusTimestamp === vcId)
    return match?.options?.entityType
  }, [vcDetail, allVcs, vcId])

  const config = entityType ? ENTITY_TYPE_CONFIG[entityType] : null

  // Show lifecycle when: policy has stages defined + VC is a project-related type
  const showLifecycle =
    !!policy.lifecycleStages?.length &&
    !!entityType &&
    PROJECT_ENTITY_TYPES.has(entityType)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/policy/${policy.slug}/projects`}>
            <IconArrowLeft className="size-4 mr-1" />
            Projects
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
          <h2 className="text-2xl font-semibold">
            {config?.label ?? "Project Document"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {vcDetail?.item
              ? formatTimestamp(vcDetail.item.consensusTimestamp)
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

      {showLifecycle && allVcs && allVcs.length > 0 && (
        <ProjectLifecycleTimeline
          stages={policy.lifecycleStages!}
          vcId={vcId}
          allVcs={allVcs}
        />
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <IconLoader className="size-5 animate-spin" />
          Loading…
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">Error: {error.message}</p>
      )}
      {vcDetail && <VCRenderer vcDetail={vcDetail} entityTypeOverride={entityType} />}
    </div>
  )
}
