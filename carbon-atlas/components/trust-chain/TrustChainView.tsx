"use client"

import * as React from "react"
import {
  IconCheck,
  IconClock,
  IconExternalLink,
  IconLoader,
  IconUserCheck,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { ChainStep } from "./ChainStep"
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import { useVcDocument } from "@/hooks/useVcDocument"
import { buildChain } from "@/lib/utils/trust-chain"
import { parseCredentialSubject } from "@/lib/api/vc-documents"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"
import { hederaTokenUrl } from "@/lib/utils/hedera"

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

/** Pending "Credits Issued" step — shown when minting hasn't happened yet */
function CreditsIssuedPending({ stepNumber }: { stepNumber: number }) {
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
              Credits Issued
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

/** Completed "Credits Issued" step — shows ER amount and links to token */
function CreditsIssuedCompleted({
  stepNumber,
  ery,
  tokenId,
  tokenUrl,
}: {
  stepNumber: number
  ery: number | null
  tokenId: string
  tokenUrl: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="size-6 rounded-full border-2 border-green-500 bg-green-100 text-green-700 mt-0.5 shrink-0 flex items-center justify-center">
          <IconCheck className="size-3.5" />
        </div>
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Badge variant="outline" className="text-xs border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              Credits Issued
            </Badge>
            <span className="text-xs text-muted-foreground flex-1">
              {ery !== null ? `${ery.toLocaleString("en-US")} tCO₂e` : "Verified"}
            </span>
            <a
              href={tokenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Badge
                variant="outline"
                className="gap-1 text-xs font-normal hover:bg-muted cursor-pointer"
              >
                Token {tokenId}
                <IconExternalLink className="size-3" />
              </Badge>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrustChainView({ rootVcId }: TrustChainViewProps) {
  const { data: allVcs, isLoading, error } = useAllPolicyVcs()
  const { data: rootDetail } = useVcDocument(rootVcId)
  const { network, deployment } = usePolicyNetwork()

  const chain = React.useMemo(() => {
    if (!allVcs) return []
    return buildChain(allVcs, rootVcId)
  }, [allVcs, rootVcId])

  // Extract ER_y from the root VC if it's an approved_report
  const rootEntityType = React.useMemo(() => {
    if (!allVcs) return undefined
    const root = allVcs.find((vc) => vc.consensusTimestamp === rootVcId)
    return root?.options?.entityType
  }, [allVcs, rootVcId])

  const ery = React.useMemo(() => {
    if (!rootDetail) return null
    const cs = parseCredentialSubject<Record<string, unknown>>(rootDetail)
    if (!cs) return null
    const val = (cs as Record<string, unknown>)?.emission_reduction
    if (val && typeof val === "object" && "ER_y" in (val as Record<string, unknown>)) {
      const n = (val as Record<string, unknown>).ER_y
      return typeof n === "number" ? n : null
    }
    return null
  }, [rootDetail])

  // Credits are issued if root is approved_report OR if a mint_token VC exists in the policy
  const hasMintToken = React.useMemo(() => {
    if (!allVcs) return false
    return allVcs.some((vc) => vc.options?.entityType === "mint_token")
  }, [allVcs])

  const creditsIssued = rootEntityType === "approved_report" || hasMintToken
  const tokenId = deployment?.tokenId ?? ""
  const tokenUrl = hederaTokenUrl(tokenId, network)

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

  const totalSteps = chain.length + 1

  return (
    <div className="space-y-0">
      <p className="text-xs text-muted-foreground mb-4">
        {totalSteps} steps in lifecycle · Newest first (top) to oldest (bottom) · Click any step to expand VC details
      </p>

      {creditsIssued ? (
        <CreditsIssuedCompleted
          stepNumber={totalSteps}
          ery={ery}
          tokenId={tokenId}
          tokenUrl={tokenUrl}
        />
      ) : (
        <CreditsIssuedPending stepNumber={totalSteps} />
      )}

      {chain.map((node, i) => {
        const stepNumber = totalSteps - 1 - i
        const isLast = i === chain.length - 1

        return (
          <React.Fragment key={node.vc.consensusTimestamp}>
            {node.entityType === "verification_report" && (
              <VVBChip label="MR Approved" />
            )}
            {node.entityType === "validation_report" && (
              <VVBChip label="Project Validated" />
            )}
            <ChainStep node={node} stepNumber={stepNumber} isLast={isLast} />
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
