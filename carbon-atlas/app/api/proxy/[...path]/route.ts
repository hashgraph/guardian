import { NextRequest, NextResponse } from "next/server"
import { getIndexerToken, invalidateTokens } from "@/lib/api/auth"

const BASE_URL = process.env.INDEXER_API_URL!

async function fetchUpstream(upstreamUrl: string, token: string) {
  return fetch(upstreamUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    // No Next.js server-side cache — we control caching via Cache-Control headers
    cache: "no-store",
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

  let token = await getIndexerToken()
  let res = await fetchUpstream(upstreamUrl, token)

  // On 401, invalidate cached token and retry once with a fresh token
  if (res.status === 401) {
    invalidateTokens()
    token = await getIndexerToken()
    res = await fetchUpstream(upstreamUrl, token)
  }

  // On 500, retry once — upstream indexer has transient failures
  if (res.status === 500) {
    res = await fetchUpstream(upstreamUrl, token)
  }

  const data = await res.json()

  return NextResponse.json(data, {
    status: res.status,
    headers: {
      // Only cache successful responses; never cache errors
      "Cache-Control": res.ok
        ? "s-maxage=600, stale-while-revalidate=3600"
        : "no-store",
    },
  })
}
