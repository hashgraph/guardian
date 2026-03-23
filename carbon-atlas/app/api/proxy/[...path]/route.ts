import { NextRequest, NextResponse } from "next/server"
import { getIndexerToken, invalidateTokens } from "@/lib/api/auth"

const BASE_URL = process.env.INDEXER_API_URL!

async function fetchUpstream(upstreamUrl: string, token: string) {
  return fetch(upstreamUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 600 },  // 10 min server-side cache
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join("/")

  // Extract _network param and strip it from forwarded query
  const searchParams = new URLSearchParams(request.nextUrl.searchParams)
  const network = searchParams.get("_network") || "mainnet"
  searchParams.delete("_network")
  const qs = searchParams.toString()

  const upstreamUrl = `${BASE_URL}/${network}/${pathStr}${qs ? `?${qs}` : ""}`

  const token = await getIndexerToken()
  let res = await fetchUpstream(upstreamUrl, token)

  // On 401, invalidate cached token and retry once with a fresh token
  if (res.status === 401) {
    invalidateTokens()
    const freshToken = await getIndexerToken()
    res = await fetchUpstream(upstreamUrl, freshToken)
  }

  const data = await res.json()

  return NextResponse.json(data, {
    status: res.status,
    headers: {
      // 10 min fresh, serve stale for up to 1 hr while revalidating
      "Cache-Control": "s-maxage=600, stale-while-revalidate=3600",
    },
  })
}
