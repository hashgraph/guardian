/**
 * Thin wrapper that routes all API calls through our auth proxy
 * so the bearer token never appears in client bundles.
 */
export async function fetchProxy<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: RequestInit
): Promise<T> {
  const searchParams = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) searchParams.set(k, String(v))
    }
  }

  const qs = searchParams.toString()
  const url = `/api/proxy/${path}${qs ? `?${qs}` : ""}`

  const res = await fetch(url, {
    ...options,
    next: { revalidate: 60 },
  } as RequestInit)

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`)
  }

  return res.json() as Promise<T>
}
