"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  IconArrowLeft,
  IconArrowRight,
  IconCertificate,
  IconChevronLeft,
  IconChevronRight,
  IconGlobe,
  IconInfoCircle,
  IconLeaf,
  IconLoader,
  IconMapPin,
  IconSitemap,
} from "@tabler/icons-react"

import { registryDisplayName } from "@/lib/types/market"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
import { useMarketDeveloper, useMarketDeveloperProjects } from "@/hooks/useMarketData"

/** Special developer entries that represent system-level entries, not actual organizations. */
const SPECIAL_DEVELOPERS: Record<string, string> = {
  "Multiple Proponents":
    "This entry aggregates projects listed with multiple proponents on the registry. Individual developer attribution can be checked via registry documentation for these projects.",
  "Credits transferred from approved GHG program":
    "Credits originally issued under another approved greenhouse gas program (e.g., CDM) and transferred into this registry. Individual developer attribution can be checked via registry documentation for these projects.",
  "Deactivated Projects":
    "Placeholder entry for projects whose developer information was removed when the project was deactivated from the registry.",
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950",
  crediting: "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950",
  registered: "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950",
  listed: "text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950",
  withdrawn: "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950",
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString()
}

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

function categoryLabel(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function DeveloperDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: dev, isLoading, error } = useMarketDeveloper(id)
  const [projectPage, setProjectPage] = React.useState(0)
  const { data: projects } = useMarketDeveloperProjects(id, projectPage + 1, 20)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <IconLoader className="size-5 animate-spin" />
        Loading developer...
      </div>
    )
  }

  if (error || !dev) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-destructive">
          {error ? `Error: ${error.message}` : "Developer not found"}
        </p>
        <Button variant="outline" asChild>
          <Link href="/market/developers">
            <IconArrowLeft className="size-4 mr-1" />
            Back to Developers
          </Link>
        </Button>
      </div>
    )
  }

  const retirementRate =
    dev.total_issued && dev.total_issued > 0
      ? ((dev.total_retired ?? 0) / dev.total_issued * 100).toFixed(1)
      : null

  const projectTotalPages = projects?.total_pages ?? 0
  const specialNote = SPECIAL_DEVELOPERS[dev.name]

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6 px-4 lg:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/market/developers" className="hover:text-foreground transition-colors">
          Developers
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[300px]">{dev.name}</span>
      </div>

      {/* Special value banner */}
      {specialNote && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <IconInfoCircle className="size-4 mt-0.5 shrink-0" />
          <p>{specialNote}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold leading-tight">{dev.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {dev.registries?.map((reg) => (
            <Badge key={reg} variant="outline">
              {registryDisplayName(reg)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconSitemap className="size-3.5 text-indigo-600" />
              Projects
            </CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums">
              {formatNumber(dev.project_count)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconCertificate className="size-3.5 text-green-600" />
              Credits Issued
            </CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums">
              {formatNumber(dev.total_issued)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconLeaf className="size-3.5 text-blue-600" />
              Credits Retired
            </CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums">
              {formatNumber(dev.total_retired)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconGlobe className="size-3.5 text-amber-600" />
              Countries
            </CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums">
              {dev.countries?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Expertise */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expertise & Coverage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Categories */}
            {dev.categories && dev.categories.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Project Categories
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dev.categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs capitalize">
                      {categoryLabel(cat)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Methodologies */}
            {dev.methodologies && dev.methodologies.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Methodologies
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dev.methodologies.slice(0, 15).map((m) => (
                    <Badge key={m} variant="outline" className="text-xs font-mono uppercase">
                      {m}
                    </Badge>
                  ))}
                  {dev.methodologies.length > 15 && (
                    <Badge variant="outline" className="text-xs">
                      +{dev.methodologies.length - 15} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Retirement rate */}
            {retirementRate && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Retirement Rate
                </span>
                <span className="text-sm font-medium">{retirementRate}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel — Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <IconMapPin className="size-4" />
              Active Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dev.countries && dev.countries.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {dev.countries.map((country) => (
                  <Badge key={country} variant="outline" className="text-xs">
                    {country}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No country data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects table */}
      <Separator />
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">
          Projects
          {projects ? ` (${projects.total.toLocaleString()})` : ""}
        </h3>

        {projects && projects.items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table className="table-fixed">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[35%]">Project</TableHead>
                    <TableHead className="hidden md:table-cell w-[10%]">Registry</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="hidden lg:table-cell w-[12%]">Country</TableHead>
                    <TableHead className="text-right w-[10%]">Issued</TableHead>
                    <TableHead className="text-right hidden sm:table-cell w-[10%]">Retired</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.items.map((project) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {projectTotalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {projectPage + 1} of {projectTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectPage((p) => Math.max(0, p - 1))}
                    disabled={projectPage === 0}
                  >
                    <IconChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectPage((p) => p + 1)}
                    disabled={projectPage + 1 >= projectTotalPages}
                  >
                    <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No projects found.</p>
        )}
      </div>
    </div>
  )
}
