"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconLoader,
} from "@tabler/icons-react"
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

export default function IssuancesPage() {
  const [pageIndex, setPageIndex] = React.useState(0)
  const PAGE_SIZE = 25

  const { data, isLoading, error } = usePolicyVcDocuments(
    "approved_report",
    pageIndex,
    PAGE_SIZE
  )

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Issuances</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Verified monitoring reports — each represents a carbon credit issuance
              {data ? ` (${data.total} total)` : ""}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <IconLoader className="size-5 animate-spin" />
            Loading issuances…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">Error: {error.message}</p>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hedera</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.consensusTimestamp}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatTimestamp(item.consensusTimestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                        {item.consensusTimestamp}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortenDid(item.options?.issuer)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-green-700 border-green-300 bg-green-50 text-xs"
                        >
                          {item.options?.documentStatus ?? "Verified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <HederaProofBadge
                          consensusTimestamp={item.consensusTimestamp}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/issuances/${item.consensusTimestamp}`}>
                            <IconExternalLink className="size-3 mr-1" />
                            Trust Chain
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {pageIndex + 1} of {totalPages || "…"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                >
                  <IconChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((p) => p + 1)}
                  disabled={pageIndex + 1 >= totalPages}
                >
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
