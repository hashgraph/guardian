"use client"

import { useQuery } from "@tanstack/react-query"
import { getAllPolicyVcs } from "@/lib/api/vc-documents"
import type { EntityType, PolicyVcListResponse, VCListItem } from "@/lib/types/indexer"

/**
 * Fetch all policy VCs of a given entity type (client-side filtered) and cache
 * them. This is the base hook — getAllPolicyVcs handles pagination transparently.
 */
export function useAllPolicyVcs(entityType?: EntityType) {
  return useQuery<VCListItem[], Error>({
    queryKey: ["vc-documents-all", entityType],
    queryFn: () => getAllPolicyVcs(entityType),
    staleTime: 15 * 60 * 1000,  // 15 min
    gcTime: 60 * 60 * 1000,     // keep in memory for 1 hr
  })
}

/**
 * Paginated slice over useAllPolicyVcs.
 * The indexer API ignores options.entityType filters, so we fetch all and
 * slice in-memory. The cache is shared with useAllPolicyVcs — no extra fetches.
 */
export function usePolicyVcDocuments(
  entityType?: EntityType,
  pageIndex = 0,
  pageSize = 25
) {
  const { data: allVcs, isLoading, error } = useAllPolicyVcs(entityType)

  const start = pageIndex * pageSize
  const items = allVcs?.slice(start, start + pageSize) ?? []
  const total = allVcs?.length ?? 0

  const data: PolicyVcListResponse | undefined = allVcs
    ? { items, total, pageIndex, pageSize }
    : undefined

  return { data, isLoading, error }
}
