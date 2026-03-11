"use client"

import {
  IconCertificate,
  IconDevices,
  IconLeaf,
  IconLoader,
  IconSitemap,
} from "@tabler/icons-react"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardStats } from "@/hooks/useDashboardStats"

export function SectionCards() {
  const {
    issuanceCount,
    projectCount,
    totalERy,
    totalDevices,
    isLoading,
  } = useDashboardStats()

  const loadingEl = <IconLoader className="size-4 animate-spin text-muted-foreground" />

  const formatERy = (val: number) =>
    val.toLocaleString("en-US", { maximumFractionDigits: 2 })

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconCertificate className="size-4" />
            Verified Issuances
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loadingEl : issuanceCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Approved monitoring reports on Hedera</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconLeaf className="size-4 text-green-600" />
            Emission Reductions
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loadingEl : totalERy !== null ? formatERy(totalERy) : "—"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Total tCO₂e from verified issuances</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconSitemap className="size-4" />
            Active Projects
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loadingEl : projectCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Validated project VCs on Hedera</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <IconDevices className="size-4" />
            Monitored Devices
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? loadingEl : totalDevices !== null ? totalDevices.toLocaleString() : "—"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Cooking devices with metered energy data</div>
        </CardFooter>
      </Card>
    </div>
  )
}
