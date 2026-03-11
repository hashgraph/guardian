import { NextRequest, NextResponse } from "next/server"

const BASE_URL = process.env.INDEXER_API_URL!
const TOKEN = process.env.INDEXER_API_TOKEN!

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join("/")

  // Forward all query params
  const searchParams = request.nextUrl.searchParams.toString()
  const upstreamUrl = `${BASE_URL}/${pathStr}${searchParams ? `?${searchParams}` : ""}`

  const res = await fetch(upstreamUrl, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 600 },  // 10 min server-side cache
  })

  const data = await res.json()

  return NextResponse.json(data, {
    status: res.status,
    headers: {
      // 10 min fresh, serve stale for up to 1 hr while revalidating
      "Cache-Control": "s-maxage=600, stale-while-revalidate=3600",
    },
  })
}
