import type { EntityType, VCListItem } from "@/lib/types/indexer"

export interface EntityTypeConfig {
  label: string
  color: string
  /** Lifecycle order: 0 = newest step displayed first (top), higher = older */
  order: number
  icon: string
  summaryFields: string[]
}

export const ENTITY_TYPE_CONFIG: Record<EntityType, EntityTypeConfig> = {
  approved_report: {
    label: "Monitoring Report (Approved)",
    color: "teal",
    order: 0,
    icon: "shield-check",
    summaryFields: ["ER_y", "date_from", "date_to"],
  },
  verification_report: {
    label: "Verification Report",
    color: "blue",
    order: 1,
    icon: "file-check",
    summaryFields: ["vvb_name", "conclusion"],
  },
  report: {
    label: "Monitoring Report",
    color: "indigo",
    order: 2,
    icon: "chart-bar",
    summaryFields: ["ER_y", "date_from", "date_to"],
  },
  daily_mrv_report: {
    label: "Device dMRV Data",
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
    label: "Validation Report",
    color: "sky",
    order: 5,
    icon: "clipboard-check",
    summaryFields: ["vvb_name", "conclusion"],
  },
  project: {
    label: "Calculated Project",
    color: "orange",
    order: 6,
    icon: "calculator",
    summaryFields: ["name", "BE_y"],
  },
  project_form: {
    label: "Project Design Document",
    color: "amber",
    order: 7,
    icon: "file-text",
    summaryFields: ["name", "country", "case_type"],
  },
  // Administrative — not shown as chain nodes, but kept for VCRenderer routing
  approved_vvb: {
    label: "Approved VVB",
    color: "teal",
    order: 100,
    icon: "building",
    summaryFields: ["name"],
  },
  vvb: {
    label: "VVB Registration",
    color: "slate",
    order: 101,
    icon: "building",
    summaryFields: ["name"],
  },
}

/**
 * Entity types that represent lifecycle steps in the trust chain.
 * VVB registration/approval are administrative and shown as annotations instead.
 */
const LIFECYCLE_ENTITY_TYPES = new Set<EntityType>([
  "project_form",
  "project",
  "validation_report",
  "approved_project",
  "daily_mrv_report",
  "report",
  "verification_report",
  "approved_report",
])

export interface ChainNode {
  vc: VCListItem
  config: EntityTypeConfig
  entityType: EntityType
  depth: number
}

/**
 * Build an ordered chain of lifecycle steps from the full policy VC list.
 *
 * Uses forward relationship traversal from the root VC, then reverse-link
 * augmentation to discover VCs that reference chain members (e.g. validation
 * and verification reports), plus a fallback for verification_report VCs
 * that only reference the policy root topic.
 *
 * VVB registration/approval VCs are excluded from the chain — they're
 * administrative, not lifecycle steps.
 *
 * @param allVcs  Full list of policy VCs from `getAllPolicyVcs()`
 * @param rootTs  consensusTimestamp of the root VC (e.g. approved_report)
 */
export function buildChain(allVcs: VCListItem[], rootTs: string): ChainNode[] {
  const byTs = new Map<string, VCListItem>()
  for (const vc of allVcs) {
    byTs.set(vc.consensusTimestamp, vc)
  }

  const root = byTs.get(rootTs)
  if (!root) return []

  const visited = new Set<string>()
  const allRelated: VCListItem[] = []

  // Phase 1: Forward traversal from root via relationships
  function traverse(ts: string) {
    if (visited.has(ts)) return
    visited.add(ts)

    const vc = byTs.get(ts)
    if (!vc) return
    allRelated.push(vc)

    const rels = vc.options?.relationships ?? []
    for (const relTs of rels) {
      traverse(relTs)
    }
  }

  traverse(rootTs)

  // Phase 2: Reverse-link augmentation — find VCs whose relationships
  // point to any VC already discovered, iteratively expanding.
  const knownTs = new Set(allRelated.map((vc) => vc.consensusTimestamp))
  let changed = true
  while (changed) {
    changed = false
    for (const vc of allVcs) {
      if (visited.has(vc.consensusTimestamp)) continue
      const rels = vc.options?.relationships ?? []
      if (rels.some((r) => knownTs.has(r))) {
        visited.add(vc.consensusTimestamp)
        knownTs.add(vc.consensusTimestamp)
        allRelated.push(vc)
        changed = true
        // Also follow this VC's forward relationships
        for (const relTs of rels) {
          traverse(relTs)
        }
      }
    }
  }

  // Phase 3: Include verification_report VCs from same policy that
  // weren't reached (they may only reference the policy root topic).
  if (root.options?.entityType === "approved_report") {
    for (const vc of allVcs) {
      if (visited.has(vc.consensusTimestamp)) continue
      if (vc.options?.entityType === "verification_report") {
        visited.add(vc.consensusTimestamp)
        allRelated.push(vc)
      }
    }
  }

  // Filter to lifecycle entity types only (exclude vvb, approved_vvb)
  const nodes: ChainNode[] = []
  for (const vc of allRelated) {
    const entityType = vc.options?.entityType
    if (!entityType || !LIFECYCLE_ENTITY_TYPES.has(entityType)) continue
    const config = ENTITY_TYPE_CONFIG[entityType]
    if (config) {
      nodes.push({ vc, config, entityType, depth: 0 })
    }
  }

  // Sort by lifecycle order (0 = newest step first)
  nodes.sort((a, b) => a.config.order - b.config.order)

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

/**
 * Deduplicate projects: group project_form + approved_project as one project.
 * Returns one representative VC per project (approved_project if it exists,
 * otherwise the raw project_form). Also returns the project developer DID
 * (from the project_form) for each.
 */
export function deduplicateProjects(
  allVcs: VCListItem[]
): { vc: VCListItem; developerDid: string | undefined; stage: string }[] {
  const byTs = new Map(allVcs.map((vc) => [vc.consensusTimestamp, vc]))
  const approvedProjects = allVcs.filter(
    (vc) => vc.options?.entityType === "approved_project"
  )
  const projectForms = allVcs.filter(
    (vc) => vc.options?.entityType === "project_form"
  )

  // Trace approved_project → project → project_form to find covered forms
  const coveredFormTs = new Set<string>()
  const formForApproved = new Map<string, VCListItem>()

  for (const ap of approvedProjects) {
    const rels = ap.options?.relationships ?? []
    for (const relTs of rels) {
      const rel = byTs.get(relTs)
      if (rel?.options?.entityType === "project") {
        const projectRels = rel.options?.relationships ?? []
        for (const pRelTs of projectRels) {
          const pRel = byTs.get(pRelTs)
          if (pRel?.options?.entityType === "project_form") {
            coveredFormTs.add(pRelTs)
            formForApproved.set(ap.consensusTimestamp, pRel)
          }
        }
      }
    }
  }

  const results: { vc: VCListItem; developerDid: string | undefined; stage: string }[] = []

  // Approved projects — show as "Validated" with the developer's DID
  for (const ap of approvedProjects) {
    const form = formForApproved.get(ap.consensusTimestamp)
    results.push({
      vc: ap,
      developerDid: form?.options?.issuer ?? ap.options?.issuer,
      stage: "Validated",
    })
  }

  // Uncovered project_forms — projects not yet validated
  for (const pf of projectForms) {
    if (!coveredFormTs.has(pf.consensusTimestamp)) {
      results.push({
        vc: pf,
        developerDid: pf.options?.issuer,
        stage: "Submitted",
      })
    }
  }

  return results
}
