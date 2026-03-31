/**
 * API client for the Market Explorer FastAPI backend.
 *
 * The API base URL is set via NEXT_PUBLIC_MARKET_API_URL env var,
 * defaulting to http://localhost:8000 for development.
 */

import type {
  PaginatedResponse,
  ProjectListItem,
  ProjectDetail,
  CreditItem,
  MarketStats,
  VintageDataPoint,
  TimeSeriesDataPoint,
  CountryDataPoint,
  CategoryDataPoint,
  StatusBreakdownItem,
  VintageRemainingDataPoint,
  CountryMapDataPoint,
  ReductionRemovalDataPoint,
  DeveloperItem,
  DeveloperFilters,
  MarketProjectFilters,
  MarketCreditFilters,
} from "@/lib/types/market"

const BASE_URL =
  process.env.NEXT_PUBLIC_MARKET_API_URL || "http://localhost:8000"

async function fetchMarket<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "" && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Market API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ── Stats ──────────────────────────────────────────────────────────────

export function getMarketStats(filters?: { registry?: string; category?: string }) {
  return fetchMarket<MarketStats>("/api/v1/stats", filters)
}

// ── Projects ───────────────────────────────────────────────────────────

export function getMarketProjects(filters: MarketProjectFilters = {}) {
  return fetchMarket<PaginatedResponse<ProjectListItem>>("/api/v1/projects", filters as Record<string, string | number>)
}

export function getMarketProject(id: string) {
  return fetchMarket<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(id)}`)
}

// ── Credits ────────────────────────────────────────────────────────────

export function getMarketCredits(filters: MarketCreditFilters = {}) {
  return fetchMarket<PaginatedResponse<CreditItem>>("/api/v1/credits", filters as Record<string, string | number>)
}

// ── Charts ─────────────────────────────────────────────────────────────

export function getIssuancesByVintage() {
  return fetchMarket<VintageDataPoint[]>("/api/v1/charts/issuances-by-vintage")
}

export function getCreditsOverTime() {
  return fetchMarket<TimeSeriesDataPoint[]>("/api/v1/charts/credits-over-time")
}

export function getProjectsByCountry(limit = 15) {
  return fetchMarket<CountryDataPoint[]>("/api/v1/charts/projects-by-country", { limit })
}

export function getProjectsByCategory() {
  return fetchMarket<CategoryDataPoint[]>("/api/v1/charts/projects-by-category")
}

export function getStatusBreakdown() {
  return fetchMarket<StatusBreakdownItem[]>("/api/v1/charts/status-breakdown")
}

export function getCreditsRemainingByVintage(registry?: string) {
  return fetchMarket<VintageRemainingDataPoint[]>("/api/v1/charts/credits-remaining-by-vintage", { registry })
}

export function getProjectsByCountryMap(registry?: string) {
  return fetchMarket<CountryMapDataPoint[]>("/api/v1/charts/projects-by-country-map", { registry })
}

export function getReductionRemovalBreakdown(registry?: string) {
  return fetchMarket<ReductionRemovalDataPoint[]>("/api/v1/charts/reduction-removal-breakdown", { registry })
}

// ── Developers ─────────────────────────────────────────────────────────

export function getMarketDevelopers(filters: DeveloperFilters = {}) {
  return fetchMarket<PaginatedResponse<DeveloperItem>>("/api/v1/developers", filters as Record<string, string | number>)
}

export function getMarketDeveloperCountries() {
  return fetchMarket<string[]>("/api/v1/developers/countries")
}

export function getMarketDeveloper(id: string) {
  return fetchMarket<DeveloperItem>(`/api/v1/developers/${encodeURIComponent(id)}`)
}

export function getMarketDeveloperProjects(id: string, params?: { page?: number; page_size?: number }) {
  return fetchMarket<PaginatedResponse<ProjectListItem>>(
    `/api/v1/developers/${encodeURIComponent(id)}/projects`,
    params as Record<string, string | number>,
  )
}
