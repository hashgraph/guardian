"use client"

import * as React from "react"
import Link from "next/link"
import { IconExternalLink, IconLoader } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

export function RecentIssuancesTable() {
  const { policy } = usePolicyNetwork()
  const { data, isLoading, error } = usePolicyVcDocuments("approved_report", 0, 10)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Issuances</CardTitle>
          <CardDescription>Latest verified monitoring reports</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/policy/${policy.slug}/issuances`}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <IconLoader className="size-4 animate-spin" />
            Loading issuances…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive py-4">
            Error: {error.message}
          </p>
        )}
        {data && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.consensusTimestamp}>
                    <TableCell className="text-sm">
                      {formatTimestamp(item.consensusTimestamp)}
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/policy/${policy.slug}/issuances/${item.consensusTimestamp}`}>
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
        )}
      </CardContent>
    </Card>
  )
}
