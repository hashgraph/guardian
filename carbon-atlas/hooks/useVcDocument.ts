"use client"

import { useQuery } from "@tanstack/react-query"
import { getVcDocument } from "@/lib/api/vc-documents"
import type { VCDetail } from "@/lib/types/indexer"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

export function useVcDocument(id: string | undefined) {
  const { network } = usePolicyNetwork()

  return useQuery<VCDetail, Error>({
    queryKey: ["vc-document", network, id],
    queryFn: () => getVcDocument(id!, network),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
