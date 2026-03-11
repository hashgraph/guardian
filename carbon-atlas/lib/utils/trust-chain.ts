import type { EntityType, VCListItem } from "@/lib/types/indexer"

export interface EntityTypeConfig {
  label: string
  color: string
  order: number
  icon: string
  summaryFields: string[]
}

export const ENTITY_TYPE_CONFIG: Record<EntityType, EntityTypeConfig> = {
  approved_report: {
    label: "Verified Monitoring Report",
    color: "teal",
    order: 0,
    icon: "shield-check",
    summaryFields: ["ER_y", "date_from", "date_to"],
  },
  verification_report: {
    label: "VVB Verification Report",
    color: "blue",
    order: 1,
    icon: "file-check",
    summaryFields: ["vvb_name", "conclusion"],
  },
  report: {
    label: "Monitoring Report (Auto)",
    color: "indigo",
    order: 2,
    icon: "chart-bar",
    summaryFields: ["ER_y", "date_from", "date_to"],
  },
  daily_mrv_report: {
    label: "Device MRV Data",
    color: "violet",
    order: 3,
    icon: "device-mobile",
    summaryFields: ["device_count", "date_from", "date_to"],
  },
  approved_project: {
    label: "Validated Project",
    color: "green",
    order: 4,
    icon: "check-circle",
    summaryFields: ["name", "country"],
  },
  validation_report: {
    label: "VVB Validation Report",
    color: "sky",
    order: 5,
    icon: "clipboard-check",
    summaryFields: ["vvb_name", "conclusion"],
  },
  project_form: {
    label: "Project Design Document",
    color: "amber",
    order: 6,
    icon: "file-text",
    summaryFields: ["name", "country", "case_type"],
  },
  project: {
    label: "Calculated Project",
    color: "orange",
    order: 7,
    icon: "calculator",
    summaryFields: ["name", "BE_y"],
  },
  approved_vvb: {
    label: "Verified VVB",
    color: "teal",
    order: 8,
    icon: "building",
    summaryFields: ["name"],
  },
  vvb: {
    label: "VVB Registration",
    color: "slate",
    order: 9,
    icon: "building",
    summaryFields: ["name"],
  },
}

export interface ChainNode {
  vc: VCListItem
  config: EntityTypeConfig
  entityType: EntityType
  depth: number
}

/**
 * Build an ordered chain array from the full policy VC list,
 * traversing relationships from the given root VC (approved_report).
 *
 * Returns nodes ordered by relationship depth (root first).
 */
/**
 * Build an ordered chain array from the full policy VC list,
 * traversing relationships from the given root VC.
 *
 * IMPORTANT: The API uses `consensusTimestamp` as the primary identifier —
 * both for individual VC lookups AND in the `options.relationships` array.
 * We therefore key the lookup map by `consensusTimestamp`.
 *
 * @param allVcs    Full list of policy VCs from `getAllPolicyVcs()`
 * @param rootTs    consensusTimestamp of the root VC (e.g. approved_report)
 */
export function buildChain(allVcs: VCListItem[], rootTs: string): ChainNode[] {
  // Key by consensusTimestamp — strip trailing zeros so lookups are robust
  const byTs = new Map<string, VCListItem>()
  for (const vc of allVcs) {
    byTs.set(vc.consensusTimestamp, vc)
  }

  const root = byTs.get(rootTs)
  if (!root) return []

  const nodes: ChainNode[] = []
  const visited = new Set<string>()

  function traverse(ts: string, depth: number) {
    if (visited.has(ts)) return
    visited.add(ts)

    const vc = byTs.get(ts)
    if (!vc) return

    const entityType = vc.options?.entityType
    const config = ENTITY_TYPE_CONFIG[entityType]
    if (config) {
      nodes.push({ vc, config, entityType, depth })
    }

    const rels = vc.options?.relationships ?? []
    for (const relTs of rels) {
      traverse(relTs, depth + 1)
    }
  }

  traverse(rootTs, 0)
  return nodes
}

/** Extract unique project developer DIDs from project_form documents. */
export function getProjectDevelopers(allVcs: VCListItem[]): string[] {
  const issuers = new Set<string>()
  for (const vc of allVcs) {
    if (vc.options?.entityType === "project_form" && vc.options?.issuer) {
      issuers.add(vc.options.issuer)
    }
  }
  return Array.from(issuers)
}
