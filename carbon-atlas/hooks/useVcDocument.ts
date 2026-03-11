"use client"

import { useQuery } from "@tanstack/react-query"
import { getVcDocument } from "@/lib/api/vc-documents"
import type { VCDetail } from "@/lib/types/indexer"

export function useVcDocument(id: string | undefined) {
  return useQuery<VCDetail, Error>({
    queryKey: ["vc-document", id],
    queryFn: () => getVcDocument(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
