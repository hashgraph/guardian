"use client"

import * as React from "react"
import Link from "next/link"
import { IconExternalLink, IconLoader } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePolicyVcDocuments } from "@/hooks/usePolicyVcDocuments"
import { formatTimestamp, shortenDid } from "@/lib/utils/format"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { ProjectDeveloperBadge } from "@/components/shared/ProjectDeveloperBadge"

export default function ProjectsPage() {
  const { data: forms, isLoading: loadingForms } = usePolicyVcDocuments(
    "project_form",
    0,
    50
  )
  const { data: approved, isLoading: loadingApproved } = usePolicyVcDocuments(
    "approved_project",
    0,
    50
  )

  const isLoading = loadingForms || loadingApproved
  const allItems = [
    ...(approved?.items ?? []),
    ...(forms?.items ?? []),
  ]

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Projects</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Project Design Documents and validated project VCs
            </p>
          </div>
          <ProjectDeveloperBadge className="hidden sm:flex" />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <IconLoader className="size-5 animate-spin" />
            Loading projects…
          </div>
        )}

        {!isLoading && allItems.length > 0 && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hedera</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={item.consensusTimestamp}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatTimestamp(item.consensusTimestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.options?.entityType === "approved_project"
                          ? "Validated"
                          : "PDD"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {shortenDid(item.options?.issuer)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.options?.entityType === "approved_project"
                            ? "text-green-700 border-green-300 bg-green-50 text-xs"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {item.options?.documentStatus ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <HederaProofBadge
                        consensusTimestamp={item.consensusTimestamp}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${item.consensusTimestamp}`}>
                          <IconExternalLink className="size-3 mr-1" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && allItems.length === 0 && (
          <p className="text-muted-foreground text-sm py-4">No project documents found.</p>
        )}
      </div>
    </DashboardLayout>
  )
}
