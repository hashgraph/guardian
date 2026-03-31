"use client"

import * as React from "react"
import { IconCircleCheck, IconCircleDashed } from "@tabler/icons-react"
import type { LifecycleStage } from "@/lib/policies/types"
import type { VCListItem } from "@/lib/types/indexer"
import type { EntityType } from "@/lib/types/indexer"

interface ProjectLifecycleTimelineProps {
  stages: LifecycleStage[]
  /** The consensus timestamp of the root VC being viewed */
  vcId: string
  /** All VCs for this policy+network — used to determine which stages are complete */
  allVcs: VCListItem[]
}

/**
 * Traverses the full VC relationship graph bidirectionally to determine which
 * lifecycle stages are complete for the given project VC.
 *
 * Uses an iterative BFS that expands in both directions until no new nodes
 * are found — this ensures multi-hop chains like:
 *   project → report → verification_report → approved_report
 * are fully traversed even when monitoring VCs don't reference approved_project.
 */
function resolveCompletedStages(
  vcId: string,
  allVcs: VCListItem[]
): Set<EntityType> {
  const completed = new Set<EntityType>()
  if (!allVcs.length) return completed

  const byTs = new Map(allVcs.map((vc) => [vc.consensusTimestamp, vc]))

  // Build a reverse-adjacency index: ts → [VCs that reference ts]
  const reverseIndex = new Map<string, string[]>()
  for (const vc of allVcs) {
    for (const relTs of vc.options?.relationships ?? []) {
      const list = reverseIndex.get(relTs) ?? []
      list.push(vc.consensusTimestamp)
      reverseIndex.set(relTs, list)
    }
  }

  // Full bidirectional BFS: expand forward (via relationships) AND reverse
  // (via reverseIndex) until the frontier is empty.
  const visited = new Set<string>()
  const queue = [vcId]

  while (queue.length > 0) {
    const ts = queue.shift()!
    if (visited.has(ts)) continue
    visited.add(ts)

    const vc = byTs.get(ts)
    if (vc?.options?.entityType) {
      completed.add(vc.options.entityType as EntityType)
    }

    // Forward: follow this VC's relationship pointers
    for (const relTs of vc?.options?.relationships ?? []) {
      if (!visited.has(relTs)) queue.push(relTs)
    }

    // Reverse: find VCs that point to this one
    for (const reverseTs of reverseIndex.get(ts) ?? []) {
      if (!visited.has(reverseTs)) queue.push(reverseTs)
    }
  }

  return completed
}

/**
 * Generic horizontal lifecycle timeline for any policy's project stages.
 * Driven entirely by the `stages` array from `policy.lifecycleStages`.
 *
 * A stage is shown as "complete" (green check) when its entityType is found
 * in the VC relationship chain for the current project VC.
 */
export function ProjectLifecycleTimeline({
  stages,
  vcId,
  allVcs,
}: ProjectLifecycleTimelineProps) {
  const completed = React.useMemo(
    () => resolveCompletedStages(vcId, allVcs),
    [vcId, allVcs]
  )

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        Project Lifecycle
      </p>
      <ol className="flex flex-wrap items-start gap-y-3 gap-x-0">
        {stages.map((stage, idx) => {
          const isDone = completed.has(stage.entityType)
          const isLast = idx === stages.length - 1

          return (
            <React.Fragment key={stage.entityType}>
              <li
                className="flex flex-col items-center gap-1 min-w-[72px] max-w-[108px]"
                title={stage.description}
              >
                {isDone ? (
                  <IconCircleCheck className="size-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <IconCircleDashed className="size-5 text-muted-foreground/40 shrink-0" />
                )}
                <span
                  className={`text-[11px] text-center leading-tight ${
                    isDone
                      ? "font-medium text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {stage.label}
                </span>
              </li>

              {!isLast && (
                <li
                  aria-hidden
                  className="flex items-start pt-[5px] px-0.5 text-muted-foreground/30 select-none text-sm"
                >
                  →
                </li>
              )}
            </React.Fragment>
          )
        })}
      </ol>
    </div>
  )
}
