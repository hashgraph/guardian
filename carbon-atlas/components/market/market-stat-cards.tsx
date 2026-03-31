"use client"

import { registryDisplayName } from "@/lib/types/market"
import {
  IconArrowDown,
  IconArrowUp,
  IconBuildingFactory,
  IconCertificate,
  IconGlobe,
  IconLoader,
  IconRecycle,
  IconSitemap,
} from "@tabler/icons-react"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useMarketStats } from "@/hooks/useMarketData"

function formatBigNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function MarketStatCards() {
  const { data: stats, isLoading } = useMarketStats()

  const loading = <IconLoader className="size-4 animate-spin text-muted-foreground" />

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconSitemap className="size-4" />
            Total Projects
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loading : stats?.total_projects.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Across {isLoading ? "…" : stats?.num_registries} registries and{" "}
            {isLoading ? "…" : stats?.num_countries} countries
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconCertificate className="size-4 text-green-600" />
            Credits Issued
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loading : formatBigNumber(stats?.total_issued ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <IconArrowUp className="size-3.5 text-green-600" />
            Total carbon credits issued (tCO₂e)
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconRecycle className="size-4 text-blue-600" />
            Credits Retired
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loading : formatBigNumber(stats?.total_retired ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <IconArrowDown className="size-3.5 text-blue-600" />
            {isLoading ? "…" : `${stats?.retirement_rate}%`} retirement rate
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconGlobe className="size-4" />
            Countries
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loading : stats?.num_countries}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <IconBuildingFactory className="size-3.5" />
            {isLoading ? "…" : Object.keys(stats?.by_registry ?? {}).map(r =>
              `${registryDisplayName(r)} (${stats?.by_registry[r].toLocaleString()})`
            ).join(", ")}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
