"use client"

import * as React from "react"
import Link from "next/link"
import { IconArrowRight, IconLoader } from "@tabler/icons-react"
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
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import { formatTimestamp } from "@/lib/utils/format"
import { HederaProofBadge } from "@/components/shared/HederaProofBadge"
import { CopyableId } from "@/components/shared/CopyableId"
import { deduplicateProjects } from "@/lib/utils/trust-chain"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

const STAGE_STYLES: Record<string, string> = {
  Calculated: "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30",
  Submitted: "text-muted-foreground",
  Validated: "text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30",
  Revoked: "text-destructive border-destructive/30 bg-destructive/5",
}

export function RecentProjectsTable() {
  const { policy } = usePolicyNetwork()
  const { data: allVcs, isLoading } = useAllPolicyVcs()

  const projects = React.useMemo(() => {
    if (!allVcs) return []
    return deduplicateProjects(allVcs).slice(0, 10)
  }, [allVcs])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Latest project submissions to this policy</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/policy/${policy.slug}/projects`}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <IconLoader className="size-4 animate-spin" />
            Loading projects…
          </div>
        )}
        {!isLoading && projects.length > 0 && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hedera</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(({ vc, developerDid, stage }) => (
                  <TableRow key={vc.consensusTimestamp}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatTimestamp(vc.consensusTimestamp)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {developerDid ? (
                        <CopyableId value={developerDid} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STAGE_STYLES[stage] ?? "text-muted-foreground"}`}
                      >
                        {stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <HederaProofBadge consensusTimestamp={vc.consensusTimestamp} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/policy/${policy.slug}/projects/${vc.consensusTimestamp}`}>
                          View
                          <IconArrowRight className="size-3 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!isLoading && projects.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">No projects found.</p>
        )}
      </CardContent>
    </Card>
  )
}
