import { fetchProxy } from "./client"
import type {
  PolicyVcListResponse,
  VCDetail,
  VCListItem,
  EntityType,
} from "@/lib/types/indexer"

// Hedera policy ID — confirmed working as `analytics.policyId` filter
const POLICY_HEDERA_ID = process.env.NEXT_PUBLIC_POLICY_HEDERA_ID!

export interface VcDocumentFilters {
  entityType?: EntityType
  documentStatus?: string
  pageIndex?: number
  pageSize?: number
  orderField?: string
  orderDir?: "ASC" | "DESC"
}

export async function getVcDocuments(
  filters: VcDocumentFilters = {}
): Promise<PolicyVcListResponse> {
  const params: Record<string, string | number | undefined> = {
    "analytics.policyId": POLICY_HEDERA_ID,
    pageIndex: filters.pageIndex ?? 0,
    pageSize: filters.pageSize ?? 25,
    orderField: filters.orderField ?? "consensusTimestamp",
    orderDir: filters.orderDir ?? "DESC",
  }

  // NOTE: options.entityType dot-notation filter is ignored by the indexer API —
  // filtering is done client-side after fetch (see getAllPolicyVcs / getVcDocuments callers)

  return fetchProxy<PolicyVcListResponse>("entities/vc-documents", params)
}

/**
 * Fetch a single VC by its consensusTimestamp (the indexer's path-param key).
 * e.g. "1767600748.312578844"
 */
export async function getVcDocument(consensusTimestamp: string): Promise<VCDetail> {
  return fetchProxy<VCDetail>(`entities/vc-documents/${consensusTimestamp}`)
}

/**
 * Fetch all policy VCs (paginated) then optionally filter by entityType client-side.
 * The indexer API ignores options.entityType as a query param.
 */
export async function getAllPolicyVcs(
  entityType?: EntityType
): Promise<VCListItem[]> {
  const PAGE_SIZE = 100
  const first = await getVcDocuments({ pageSize: PAGE_SIZE, pageIndex: 0 })
  const total = first.total
  const allItems = [...first.items]

  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        getVcDocuments({ pageSize: PAGE_SIZE, pageIndex: i + 1 })
      )
    )
    for (const r of rest) allItems.push(...r.items)
  }

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
