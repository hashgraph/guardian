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
} from "@/lib/api/market"
import type { MarketProjectFilters, MarketCreditFilters } from "@/lib/types/market"

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
