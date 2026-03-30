/**
 * Custom error that carries the HTTP status code so TanStack Query
 * retry logic can distinguish transient failures from auth errors.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Thin wrapper that routes all API calls through our auth proxy
 * so the bearer token never appears in client bundles.
 *
 * The `network` param is forwarded as `_network` so the proxy can
 * route to the correct indexer endpoint (mainnet vs testnet).
 */
export async function fetchProxy<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  network: string = "mainnet"
): Promise<T> {
  const searchParams = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) searchParams.set(k, String(v))
    }
  }
  searchParams.set("_network", network)

  const qs = searchParams.toString()
  const url = `/api/proxy/${path}${qs ? `?${qs}` : ""}`

  const res = await fetch(url, {
    next: { revalidate: 60 },
  } as RequestInit)

  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status}: ${await res.text()}`)
  }

  return res.json() as Promise<T>
}
