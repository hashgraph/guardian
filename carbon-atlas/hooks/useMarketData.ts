"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  getMarketStats,
  getMarketProjects,
  getMarketProject,
  getMarketCredits,
  getIssuancesByVintage,
  getCreditsOverTime,
  getProjectsByCountry,
  getProjectsByCategory,
  getStatusBreakdown,
  getCreditsRemainingByVintage,
  getProjectsByCountryMap,
  getReductionRemovalBreakdown,
  getMarketDevelopers,
  getMarketDeveloper,
  getMarketDeveloperProjects,
  getMarketDeveloperCountries,
} from "@/lib/api/market"
import type { MarketProjectFilters, MarketCreditFilters, DeveloperFilters } from "@/lib/types/market"

export function useMarketStats(filters?: { registry?: string; category?: string }) {
  return useQuery({
    queryKey: ["market-stats", filters],
    queryFn: () => getMarketStats(filters),
  })
}

export function useMarketProjects(filters: MarketProjectFilters = {}) {
  return useQuery({
    queryKey: ["market-projects", filters],
    queryFn: () => getMarketProjects(filters),
    placeholderData: keepPreviousData,
  })
}

export function useMarketProject(id: string) {
  return useQuery({
    queryKey: ["market-project", id],
    queryFn: () => getMarketProject(id),
    enabled: !!id,
  })
}

export function useMarketCredits(filters: MarketCreditFilters = {}) {
  return useQuery({
    queryKey: ["market-credits", filters],
    queryFn: () => getMarketCredits(filters),
    placeholderData: keepPreviousData,
  })
}

export function useIssuancesByVintage() {
  return useQuery({
    queryKey: ["market-chart-vintage"],
    queryFn: getIssuancesByVintage,
  })
}

export function useCreditsOverTime() {
  return useQuery({
    queryKey: ["market-chart-credits-time"],
    queryFn: getCreditsOverTime,
  })
}

export function useProjectsByCountry(limit = 15) {
  return useQuery({
    queryKey: ["market-chart-countries", limit],
    queryFn: () => getProjectsByCountry(limit),
  })
}

export function useProjectsByCategory() {
  return useQuery({
    queryKey: ["market-chart-categories"],
    queryFn: getProjectsByCategory,
  })
}

export function useStatusBreakdown() {
  return useQuery({
    queryKey: ["market-chart-status"],
    queryFn: getStatusBreakdown,
  })
}

export function useCreditsRemainingByVintage(registry?: string) {
  return useQuery({
    queryKey: ["market-chart-vintage-remaining", registry],
    queryFn: () => getCreditsRemainingByVintage(registry),
  })
}

export function useProjectsByCountryMap(registry?: string) {
  return useQuery({
    queryKey: ["market-chart-country-map", registry],
    queryFn: () => getProjectsByCountryMap(registry),
  })
}

export function useReductionRemovalBreakdown(registry?: string) {
  return useQuery({
    queryKey: ["market-chart-reduction-removal", registry],
    queryFn: () => getReductionRemovalBreakdown(registry),
  })
}

// ── Developers ──────────────────────────────────────────────────────────

export function useMarketDevelopers(filters: DeveloperFilters = {}) {
  return useQuery({
    queryKey: ["market-developers", filters],
    queryFn: () => getMarketDevelopers(filters),
    placeholderData: keepPreviousData,
  })
}

export function useMarketDeveloperCountries() {
  return useQuery({
    queryKey: ["market-developer-countries"],
    queryFn: getMarketDeveloperCountries,
    staleTime: 1000 * 60 * 60, // 1 hour — country list rarely changes
  })
}

export function useMarketDeveloper(id: string) {
  return useQuery({
    queryKey: ["market-developer", id],
    queryFn: () => getMarketDeveloper(id),
    enabled: !!id,
  })
}

export function useMarketDeveloperProjects(id: string, page = 1, pageSize = 25) {
  return useQuery({
    queryKey: ["market-developer-projects", id, page, pageSize],
    queryFn: () => getMarketDeveloperProjects(id, { page, page_size: pageSize }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })
}
