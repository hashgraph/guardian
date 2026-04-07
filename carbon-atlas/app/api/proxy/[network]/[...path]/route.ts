import { NextRequest, NextResponse } from "next/server"
import { getIndexerToken, invalidateTokens } from "@/lib/api/auth"

const BASE_URL =
  process.env.INDEXER_API_BASE_URL ?? process.env.INDEXER_API_URL!

async function fetchUpstream(upstreamUrl: string, token: string) {
  return fetch(upstreamUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ network: string; path: string[] }> }
) {
  const { network, path } = await params
  const pathStr = path.join("/")

  const searchParams = new URLSearchParams(request.nextUrl.searchParams)
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
      "Cache-Control": res.ok
        ? "s-maxage=600, stale-while-revalidate=3600"
        : "no-store",
    },
  })
}
