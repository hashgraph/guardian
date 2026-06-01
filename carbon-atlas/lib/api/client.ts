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
 * Uses the network-segmented proxy: /api/proxy/{network}/{path}
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

  const qs = searchParams.toString()
  const url = `/api/proxy/${network}/${path}${qs ? `?${qs}` : ""}`

  const res = await fetch(url, {
    cache: "no-store",
  } as RequestInit)

  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status}: ${await res.text()}`)
  }

  return res.json() as Promise<T>
}
