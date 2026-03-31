"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconLoader,
  IconSearch,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMarketProjects } from "@/hooks/useMarketData"
import { registryDisplayName } from "@/lib/types/market"
import type { MarketProjectFilters } from "@/lib/types/market"

const PAGE_SIZE = 25

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950",
  crediting: "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950",
  registered: "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950",
  completed: "text-slate-700 border-slate-300 bg-slate-50 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-900",
  listed: "text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950",
  under_validation: "text-orange-700 border-orange-300 bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:bg-orange-950",
  under_development: "text-purple-700 border-purple-300 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950",
  withdrawn: "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950",
  inactive: "text-gray-600 border-gray-300 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900",
  on_hold: "text-gray-600 border-gray-300 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900",
}

const REGISTRY_OPTIONS = [
  { value: "verra", label: "Verra" },
  { value: "gold-standard", label: "Gold Standard" },
  { value: "american-carbon-registry", label: "ACR" },
  { value: "climate-action-reserve", label: "CAR" },
  { value: "art-trees", label: "ART TREES" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "crediting", label: "Crediting" },
  { value: "registered", label: "Registered" },
  { value: "completed", label: "Completed" },
  { value: "listed", label: "Listed" },
  { value: "under_validation", label: "Under Validation" },
  { value: "under_development", label: "Under Development" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "inactive", label: "Inactive" },
  { value: "on_hold", label: "On Hold" },
]

const CATEGORY_OPTIONS = [
  { value: "renewable-energy", label: "Renewable Energy" },
  { value: "fuel-switching", label: "Fuel Switching" },
  { value: "energy-efficiency", label: "Energy Efficiency" },
  { value: "forest", label: "Forest" },
  { value: "ghg-management", label: "GHG Management" },
  { value: "agriculture", label: "Agriculture" },
  { value: "land-use", label: "Land Use" },
  { value: "carbon-capture", label: "Carbon Capture" },
]

function formatCredits(n: number | null | undefined): string {
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function statusLabel(s: string | null): string {
  if (!s) return "—"
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function MarketProjectsPage() {
  const [page, setPage] = React.useState(0)
  const [searchInput, setSearchInput] = React.useState("")
  const [filters, setFilters] = React.useState<MarketProjectFilters>({})

  // Debounce search
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: val || undefined }))
      setPage(0)
    }, 300)
  }

  const apiFilters: MarketProjectFilters = {
    ...filters,
    page: page + 1,
    page_size: PAGE_SIZE,
    sort: "-issued",
  }

  const { data, isLoading, isFetching } = useMarketProjects(apiFilters)
  const totalPages = data?.total_pages ?? 0

  const setFilter = (key: keyof MarketProjectFilters, value: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchInput("")
    setPage(0)
  }

  const hasActiveFilters = filters.registry || filters.status || filters.category || filters.search

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Carbon offset projects across all registries
            {data ? ` (${data.total.toLocaleString()} total)` : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8 w-[240px] h-9"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <Select
          value={filters.registry ?? ""}
          onValueChange={(v) => setFilter("registry", v || undefined)}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Registry" />
          </SelectTrigger>
          <SelectContent>
            {REGISTRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ""}
          onValueChange={(v) => setFilter("status", v || undefined)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category ?? ""}
          onValueChange={(v) => setFilter("category", v || undefined)}
        >
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
            <IconX className="size-3.5" />
            Clear
          </Button>
        )}

        {isFetching && !isLoading && (
          <IconLoader className="size-4 animate-spin text-muted-foreground ml-1" />
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <IconLoader className="size-5 animate-spin" />
          Loading projects...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed">
              <TableHeader className="bg-muted sticky top-0">
                <TableRow>
                  <TableHead className="w-[35%]">Project</TableHead>
                  <TableHead className="hidden md:table-cell w-[10%]">Registry</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="hidden lg:table-cell w-[10%]">Country</TableHead>
                  <TableHead className="hidden lg:table-cell w-[13%]">Category</TableHead>
                  <TableHead className="text-right w-[8%]">Issued</TableHead>
                  <TableHead className="text-right hidden sm:table-cell w-[8%]">Retired</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((project) => (
                    <TableRow key={project.project_id}>
                      <TableCell className="max-w-[300px]">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <Link
                            href={`/market/projects/${project.project_id}`}
                            className="font-medium text-sm hover:underline truncate block"
                            title={project.name ?? project.project_id}
                          >
                            {project.name ?? project.project_id}
                          </Link>
                          <span className="text-xs text-muted-foreground font-mono">
                            {project.project_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {registryDisplayName(project.registry)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap ${STATUS_COLORS[project.status ?? ""] ?? ""}`}
                        >
                          {statusLabel(project.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {project.country ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm capitalize">
                        {project.category?.replace(/-/g, " ") ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatCredits(project.issued)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums hidden sm:table-cell">
                        {formatCredits(project.retired)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild className="size-8">
                          <Link href={`/market/projects/${project.project_id}`}>
                            <IconArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {totalPages}
                {data ? ` — ${data.total.toLocaleString()} projects` : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <IconChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages}
                >
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
