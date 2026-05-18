import { fetchProxy } from "./client"
import type {
  PolicyVcListResponse,
  VCDetail,
  VCListItem,
  EntityType,
} from "@/lib/types/indexer"

export interface VcDocumentFilters {
  entityType?: EntityType
  documentStatus?: string
  pageIndex?: number
  pageSize?: number
  orderField?: string
  orderDir?: "ASC" | "DESC"
}

export interface NetworkParams {
  policyId: string
  network: string
}

/**
 * Derive entityType from schemaName + documentStatus when the indexer
 * doesn't populate options.entityType (e.g. mainnet indexer 3.3.0-rc).
 * Applies a two-pass approach: first pass uses schema/status, second pass
 * disambiguates project vs project_form using the relationship graph.
 */
function normalizeEntityTypes(items: VCListItem[]): void {
  // Pass 1: derive from schemaName + documentStatus
  for (const vc of items) {
    if (vc.options?.entityType) continue

    const schema = vc.analytics?.schemaName?.toLowerCase() ?? ""
    const status = vc.options?.documentStatus ?? ""

    if (schema.includes("minttoken") || schema === "minttoken") {
      vc.options.entityType = "mint_token"
    } else if (schema.includes("monitoring report")) {
      vc.options.entityType = status === "Verified" ? "approved_report" : "report"
    } else if (schema.includes("project description document") || schema.includes("pdd")) {
      if (status === "Validated") {
        vc.options.entityType = "approved_project"
      } else {
        // Tentatively mark as project_form; pass 2 will fix "project"
        vc.options.entityType = "project_form"
      }
    } else if (schema.includes("verification report") || schema.includes("verification")) {
      vc.options.entityType = "verification_report"
    } else if (schema.includes("validation report") || schema.includes("validation")) {
      vc.options.entityType = "validation_report"
    } else if (schema.includes("vvb")) {
      vc.options.entityType = status === "APPROVED" ? "approved_vvb" : "vvb"
    }
    // Remaining null entityTypes are handled in pass 2
  }

  // Pass 2: disambiguate project (calculated) vs project_form (raw submission).
  // A PDD that references another PDD is the calculated project.
  // An approved_project also references the calculated project.
  const byTs = new Map(items.map(vc => [vc.consensusTimestamp, vc]))

  for (const vc of items) {
    if (vc.options?.entityType !== "project_form") continue
    // If this PDD references another PDD, it's the calculated project
    for (const relTs of vc.options.relationships ?? []) {
      const rel = byTs.get(relTs)
      if (rel?.options?.entityType === "project_form") {
        vc.options.entityType = "project"
        break
      }
    }
  }

  // Also: approved_project references the calculated project
  for (const vc of items) {
    if (vc.options?.entityType === "approved_project") {
      for (const relTs of vc.options.relationships ?? []) {
        const rel = byTs.get(relTs)
        if (rel?.options?.entityType === "project_form") {
          rel.options.entityType = "project"
        }
      }
    }
  }

  // Pass 3: VCs with no schema and no entityType yet — infer from context.
  // First, identify verification_report: mint_token references it.
  for (const vc of items) {
    if (vc.options?.entityType !== "mint_token") continue
    for (const relTs of vc.options.relationships ?? []) {
      const rel = byTs.get(relTs)
      if (rel && !rel.options?.entityType) {
        rel.options.entityType = "verification_report"
      }
    }
  }

  // Now handle remaining unidentified VCs
  for (const vc of items) {
    if (vc.options?.entityType) continue
    const status = vc.options?.documentStatus ?? ""
    const rels = vc.options?.relationships ?? []

    if (status === "APPROVED") {
      vc.options.entityType = "approved_vvb"
      continue
    }

    if (status !== "NEW") continue

    // Referenced by approved_vvb → vvb registration
    const referencedByApprovedVvb = items.some(
      other => other.options?.entityType === "approved_vvb" &&
      other.options?.relationships?.includes(vc.consensusTimestamp)
    )
    if (referencedByApprovedVvb) {
      vc.options.entityType = "vvb"
      continue
    }

    // References a project/project_form → daily_mrv_report
    const refsProject = rels.some(r => {
      const rel = byTs.get(r)
      return rel?.options?.entityType === "project_form" || rel?.options?.entityType === "project"
    })
    if (refsProject) {
      vc.options.entityType = "daily_mrv_report"
      continue
    }

    // References approved_project → validation_report
    const refsApprovedProject = rels.some(r => {
      const rel = byTs.get(r)
      return rel?.options?.entityType === "approved_project"
    })
    if (refsApprovedProject) {
      vc.options.entityType = "validation_report"
      continue
    }

    // Remaining unidentified VC with status NEW that only refs root topic —
    // validation_report (verification_report already identified via mint_token)
    const allRelsUnknown = rels.every(r => !byTs.has(r))
    if (allRelsUnknown) {
      vc.options.entityType = "validation_report"
      continue
    }
  }
}

export async function getVcDocuments(
  filters: VcDocumentFilters = {},
  opts: NetworkParams
): Promise<PolicyVcListResponse> {
  const params: Record<string, string | number | undefined> = {
    "analytics.policyId": opts.policyId,
    pageIndex: filters.pageIndex ?? 0,
    pageSize: filters.pageSize ?? 25,
    orderField: filters.orderField ?? "consensusTimestamp",
    orderDir: filters.orderDir ?? "DESC",
  }

  return fetchProxy<PolicyVcListResponse>("entities/vc-documents", params, opts.network)
}

/**
 * Fetch a single VC by its consensusTimestamp (the indexer's path-param key).
 */
export async function getVcDocument(
  consensusTimestamp: string,
  network: string = "mainnet"
): Promise<VCDetail> {
  return fetchProxy<VCDetail>(`entities/vc-documents/${consensusTimestamp}`, undefined, network)
}

/**
 * Fetch all policy VCs (paginated) then optionally filter by entityType client-side.
 * The indexer API ignores options.entityType as a query param.
 */
export async function getAllPolicyVcs(
  entityType: EntityType | undefined,
  opts: NetworkParams
): Promise<VCListItem[]> {
  const PAGE_SIZE = 100
  const first = await getVcDocuments({ pageSize: PAGE_SIZE, pageIndex: 0 }, opts)
  const total = first.total
  const allItems = [...first.items]

  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        getVcDocuments({ pageSize: PAGE_SIZE, pageIndex: i + 1 }, opts)
      )
    )
    for (const r of rest) allItems.push(...r.items)
  }

  // Derive entityType when the indexer doesn't populate it (mainnet)
  normalizeEntityTypes(allItems)

  if (entityType) {
    return allItems.filter(vc => vc.options?.entityType === entityType)
  }
  return allItems
}

export function parseCredentialSubject<T = Record<string, unknown>>(
  vcDetail: VCDetail
): T | null {
  try {
    const docs = vcDetail.item.documents
    if (!docs?.length) return null
    const vcJson = JSON.parse(docs[0])
    return vcJson?.credentialSubject?.[0] ?? null
  } catch {
    return null
  }
}
