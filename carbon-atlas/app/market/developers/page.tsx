"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconLoader,
  IconSearch,
  IconX,
} from "@tabler/icons-react"
import { CheckIcon, ChevronsUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMarketDevelopers, useMarketDeveloperCountries } from "@/hooks/useMarketData"
import { registryDisplayName } from "@/lib/types/market"
import type { DeveloperFilters } from "@/lib/types/market"

const PAGE_SIZE = 25

const REGISTRY_OPTIONS = [
  { value: "verra", label: "Verra" },
  { value: "gold-standard", label: "Gold Standard" },
  { value: "american-carbon-registry", label: "ACR" },
  { value: "climate-action-reserve", label: "CAR" },
  { value: "art-trees", label: "ART TREES" },
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

/** Special developer entries that represent system-level entries, not actual organizations. */
const SPECIAL_DEVELOPERS: Record<string, string> = {
  "Multiple Proponents":
    "This entry aggregates projects listed with multiple proponents on the registry. Individual developer attribution can be checked via registry documentation for these projects.",
  "Credits transferred from approved GHG program":
    "Credits originally issued under another approved greenhouse gas program (e.g., CDM) and transferred into this registry. Individual developer attribution can be checked via registry documentation for these projects.",
  "Deactivated Projects":
    "Placeholder entry for projects whose developer information was removed when the project was deactivated from the registry. This information will be updated as it becomes available.",
}

function formatCredits(n: number | null | undefined): string {
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function categoryLabel(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function DeveloperName({ name }: { name: string }) {
  const note = SPECIAL_DEVELOPERS[name]
  if (!note) return <>{name}</>
  return (
    <span className="flex items-center gap-1.5">
      <span className="italic text-muted-foreground">{name}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconInfoCircle className="size-3.5 text-amber-500 shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[280px]">
            {note}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  )
}

export default function DevelopersPage() {
  const [page, setPage] = React.useState(0)
  const [searchInput, setSearchInput] = React.useState("")
  const [filters, setFilters] = React.useState<DeveloperFilters>({})
  const [countryOpen, setCountryOpen] = React.useState(false)

  const { data: countries } = useMarketDeveloperCountries()

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

  const apiFilters: DeveloperFilters = {
    ...filters,
    page: page + 1,
    page_size: PAGE_SIZE,
    sort: filters.sort ?? "-project_count",
  }

  const { data, isLoading, isFetching } = useMarketDevelopers(apiFilters)
  const totalPages = data?.total_pages ?? 0

  const setFilter = (key: keyof DeveloperFilters, value: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchInput("")
    setPage(0)
  }

  const hasActiveFilters = filters.registry || filters.category || filters.country || filters.search

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Project Developers</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Organizations developing carbon offset projects
            {data ? ` (${data.total.toLocaleString()} total)` : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search developers..."
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

        {/* Country — searchable combobox */}
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className="w-[170px] h-9 justify-between font-normal"
            >
              <span className="truncate">
                {filters.country ?? "Country"}
              </span>
              <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countries?.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        setFilter("country", c === filters.country ? undefined : c)
                        setCountryOpen(false)
                      }}
                    >
                      <CheckIcon className={`size-3.5 mr-1.5 ${filters.country === c ? "opacity-100" : "opacity-0"}`} />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
          Loading developers...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed">
              <TableHeader className="bg-muted sticky top-0">
                <TableRow>
                  <TableHead className="w-[30%]">Developer</TableHead>
                  <TableHead className="text-right w-[8%]">Projects</TableHead>
                  <TableHead className="text-right w-[10%]">Issued</TableHead>
                  <TableHead className="text-right hidden sm:table-cell w-[10%]">Retired</TableHead>
                  <TableHead className="hidden md:table-cell w-[14%]">Categories</TableHead>
                  <TableHead className="hidden lg:table-cell w-[12%]">Registries</TableHead>
                  <TableHead className="hidden lg:table-cell w-[10%]">Countries</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No developers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((dev) => (
                    <TableRow key={dev.id}>
                      <TableCell className="max-w-[300px]">
                        <Link
                          href={`/market/developers/${dev.id}`}
                          className="font-medium text-sm hover:underline truncate block"
                          title={dev.name}
                        >
                          <DeveloperName name={dev.name} />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {dev.project_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatCredits(dev.total_issued)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums hidden sm:table-cell">
                        {formatCredits(dev.total_retired)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {dev.categories?.slice(0, 2).map((cat) => (
                            <Badge key={cat} variant="outline" className="text-[10px] capitalize whitespace-nowrap">
                              {categoryLabel(cat)}
                            </Badge>
                          ))}
                          {(dev.categories?.length ?? 0) > 2 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{(dev.categories?.length ?? 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {dev.registries?.map((reg) => (
                            <Badge key={reg} variant="outline" className="text-[10px] whitespace-nowrap">
                              {registryDisplayName(reg)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {dev.countries?.length ?? 0} {(dev.countries?.length ?? 0) === 1 ? "country" : "countries"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild className="size-8">
                          <Link href={`/market/developers/${dev.id}`}>
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
                {data ? ` — ${data.total.toLocaleString()} developers` : ""}
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
