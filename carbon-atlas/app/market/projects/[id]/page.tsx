"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  IconArrowLeft,
  IconCalendar,
  IconCertificate,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconLeaf,
  IconLoader,
  IconMapPin,
  IconUser,
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
import { useMarketProject, useMarketCredits } from "@/hooks/useMarketData"

const STATUS_COLORS: Record<string, string> = {
  crediting: "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950",
  registered: "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950",
  listed: "text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950",
  under_validation: "text-orange-700 border-orange-300 bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:bg-orange-950",
  under_development: "text-purple-700 border-purple-300 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950",
  withdrawn: "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950",
  inactive: "text-gray-600 border-gray-300 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900",
  on_hold: "text-gray-600 border-gray-300 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900",
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString()
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function statusLabel(s: string | null): string {
  if (!s) return "—"
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

export default function MarketProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading, error } = useMarketProject(id)
  const [creditPage, setCreditPage] = React.useState(0)
  const { data: credits } = useMarketCredits({
    project_id: id,
    page: creditPage + 1,
    page_size: 20,
    sort: "-transaction_date",
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <IconLoader className="size-5 animate-spin" />
        Loading project...
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-destructive">
          {error ? `Error: ${error.message}` : "Project not found"}
        </p>
        <Button variant="outline" asChild>
          <Link href="/market/projects">
            <IconArrowLeft className="size-4 mr-1" />
            Back to Projects
          </Link>
        </Button>
      </div>
    )
  }

  const creditTotalPages = credits?.total_pages ?? 0

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6 px-4 lg:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/market/projects" className="hover:text-foreground transition-colors">
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground font-mono">{project.project_id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-2xl font-semibold leading-tight">
              {project.name ?? project.project_id}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{project.project_id}</span>
              <Badge variant="outline">
                {registryDisplayName(project.registry)}
              </Badge>
              {project.status && (
                <Badge
                  variant="outline"
                  className={STATUS_COLORS[project.status] ?? ""}
                >
                  {statusLabel(project.status)}
                </Badge>
              )}
            </div>
          </div>
          {project.project_url && (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <a href={project.project_url} target="_blank" rel="noopener noreferrer">
                Registry
                <IconExternalLink className="size-3.5 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconCertificate className="size-3.5 text-green-600" />
              Credits Issued
            </CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums">
              {formatNumber(project.issued)}
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
              {formatNumber(project.retired)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconMapPin className="size-3.5" />
              Country
            </CardDescription>
            <CardTitle className="text-xl font-semibold">
              {project.country ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <IconCalendar className="size-3.5" />
              Est. Annual Reductions
            </CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums">
              {project.estimated_annual_reductions
                ? formatNumber(project.estimated_annual_reductions)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Proponent">
              {project.proponent ?? "—"}
            </Field>
            <Field label="Category">
              {project.category?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "—"}
            </Field>
            <Field label="Project Type">
              {project.project_type ?? "—"}
            </Field>
            <Field label="Reduction / Removal">
              {project.reduction_removal
                ? project.reduction_removal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                : "—"}
            </Field>
            <Field label="Region">
              {project.region ?? "—"}
            </Field>
            <Field label="Registration Date">
              {formatDate(project.registration_date)}
            </Field>
            <Field label="Is Compliance">
              {project.is_compliance ? "Yes" : "No"}
            </Field>
            <Field label="CORSIA Eligible">
              {project.corsia_eligible === null ? "—" : project.corsia_eligible ? "Yes" : "No"}
            </Field>
            <Field label="First Issuance">
              {formatDate(project.first_issuance_at)}
            </Field>
            <Field label="First Retirement">
              {formatDate(project.first_retirement_at)}
            </Field>
            <Field label="AFOLU Activities">
              {project.afolu_activities ?? "—"}
            </Field>
            {project.crediting_period_start && (
              <Field label="Crediting Period">
                {formatDate(project.crediting_period_start)} — {formatDate(project.crediting_period_end)}
              </Field>
            )}
            {project.protocol && project.protocol.length > 0 && (
              <Field label="Methodology">
                <div className="flex flex-wrap gap-1">
                  {project.protocol.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs font-mono uppercase">
                      {p}
                    </Badge>
                  ))}
                </div>
              </Field>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {/* SDG Goals */}
          {project.sdg_goals && project.sdg_goals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SDG Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {project.sdg_goals.map((sdg) => (
                    <Badge key={sdg} variant="secondary" className="text-xs">
                      {sdg}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Certifications */}
          {project.additional_certifications && project.additional_certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {project.additional_certifications.map((cert) => (
                    <Badge key={cert} variant="outline" className="text-xs">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Developers */}
          {project.developers && project.developers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Developers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {project.developers.map((dev) => (
                    <Link
                      key={dev.id}
                      href={`/market/developers/${dev.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <IconUser className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{dev.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Credit transactions */}
      <Separator />
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">
          Credit Transactions
          {credits ? ` (${credits.total.toLocaleString()})` : ""}
        </h3>

        {credits && credits.items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Vintage</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden md:table-cell">Beneficiary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.items.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${
                            credit.transaction_type === "retirement"
                              ? "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950"
                              : "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950"
                          }`}
                        >
                          {credit.transaction_type ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {credit.quantity?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {credit.vintage ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(credit.transaction_date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {credit.retirement_beneficiary ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {creditTotalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {creditPage + 1} of {creditTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreditPage((p) => Math.max(0, p - 1))}
                    disabled={creditPage === 0}
                  >
                    <IconChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreditPage((p) => p + 1)}
                    disabled={creditPage + 1 >= creditTotalPages}
                  >
                    <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No credit transactions found.</p>
        )}
      </div>
    </div>
  )
}
