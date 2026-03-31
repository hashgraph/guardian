/** TypeScript types for the Market Explorer API (FastAPI backend). */

export const REGISTRY_DISPLAY_NAMES: Record<string, string> = {
  "verra": "Verra",
  "gold-standard": "Gold Standard",
  "american-carbon-registry": "ACR",
  "climate-action-reserve": "CAR",
  "art-trees": "ART TREES",
}

export function registryDisplayName(slug: string): string {
  return REGISTRY_DISPLAY_NAMES[slug] ?? slug
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ProjectListItem {
  project_id: string
  name: string | null
  registry: string
  status: string | null
  country: string | null
  category: string | null
  proponent: string | null
  issued: number
  retired: number
  listed_at: string | null
  reduction_removal: string | null
  corsia_eligible: boolean | null
}

export interface DeveloperBrief {
  id: string
  name: string
}

export interface ProjectDetail {
  project_id: string
  name: string | null
  registry: string
  proponent: string | null
  protocol: string[] | null
  category: string | null
  status: string | null
  country: string | null
  listed_at: string | null
  is_compliance: boolean | null
  retired: number
  issued: number
  first_issuance_at: string | null
  first_retirement_at: string | null
  project_url: string | null
  project_type: string | null
  project_type_source: string | null
  sdg_goals: string[] | null
  crediting_period_start: string | null
  crediting_period_end: string | null
  description: string | null
  additional_certifications: string[] | null
  afolu_activities: string | null
  region: string | null
  registration_date: string | null
  estimated_annual_reductions: number | null
  reduction_removal: string | null
  corsia_eligible: boolean | null
  developers: DeveloperBrief[] | null
}

export interface CreditItem {
  id: number
  project_id: string
  quantity: number | null
  vintage: number | null
  transaction_date: string | null
  transaction_type: string | null
  retirement_beneficiary: string | null
  retirement_reason: string | null
  registry: string | null
  is_planned: boolean
}

export interface MarketStats {
  total_projects: number
  total_issued: number
  total_retired: number
  retirement_rate: number
  num_countries: number
  num_registries: number
  by_registry: Record<string, number>
  by_category: Record<string, number>
}

export interface VintageDataPoint {
  vintage: number
  issued: number
  retired: number
}

export interface TimeSeriesDataPoint {
  date: string
  issued: number
  retired: number
}

export interface CountryDataPoint {
  country: string
  count: number
}

export interface CategoryDataPoint {
  category: string
  count: number
}

export interface StatusBreakdownItem {
  registry: string
  status: string
  count: number
}

export interface VintageRemainingDataPoint {
  vintage: number
  issued: number
  retired: number
  remaining: number
}

export interface CountryMapDataPoint {
  country: string
  iso3: string
  count: number
  issued: number
  retired: number
}

export interface ReductionRemovalDataPoint {
  reduction_removal: string
  count: number
  issued: number
  retired: number
}

export interface DeveloperItem {
  id: string
  name: string
  project_count: number
  total_issued: number
  total_retired: number
  countries: string[] | null
  registries: string[] | null
  categories: string[] | null
  methodologies: string[] | null
}

export interface MarketProjectFilters {
  registry?: string
  status?: string
  category?: string
  country?: string
  reduction_removal?: string
  search?: string
  sort?: string
  page?: number
  page_size?: number
}

export interface DeveloperFilters {
  search?: string
  registry?: string
  country?: string
  category?: string
  sort?: string
  page?: number
  page_size?: number
}

export interface MarketCreditFilters {
  project_id?: string
  transaction_type?: string
  registry?: string
  vintage_min?: number
  vintage_max?: number
  sort?: string
  page?: number
  page_size?: number
}
