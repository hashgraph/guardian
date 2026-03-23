"use client"

import { useQuery } from "@tanstack/react-query"
import { getVcDocument } from "@/lib/api/vc-documents"
import type { VCDetail } from "@/lib/types/indexer"
import { useNetwork } from "@/providers/NetworkProvider"

export function useVcDocument(id: string | undefined) {
  const { network } = useNetwork()

  return useQuery<VCDetail, Error>({
    queryKey: ["vc-document", network, id],
    queryFn: () => getVcDocument(id!, network),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
