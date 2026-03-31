"use client"

import {
  IconBolt,
  IconBuilding,
  IconCalendar,
  IconCertificate,
  IconChartBar,
  IconClipboardCheck,
  IconCoin,
  IconDevices,
  IconDroplet,
  IconFlame,
  IconGlobe,
  IconLeaf,
  IconLoader,
  IconMapPin,
  IconPlant,
  IconRuler,
  IconSitemap,
  IconSun,
  IconTrees,
  IconUsers,
  IconWind,
  type Icon,
} from "@tabler/icons-react"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import type { StatCardConfig } from "@/lib/policies/types"

const ICON_MAP: Record<string, Icon> = {
  // Core
  IconCertificate,
  IconLeaf,
  IconSitemap,
  IconDevices,
  IconClipboardCheck,
  // Energy
  IconBolt,
  IconSun,
  IconWind,
  IconFlame,
  // Land / Nature
  IconTrees,
  IconPlant,
  IconDroplet,
  // People / Organisation
  IconBuilding,
  IconUsers,
  // Data / Finance
  IconChartBar,
  IconCoin,
  // Location / Time
  IconMapPin,
  IconGlobe,
  IconCalendar,
  IconRuler,
}

function formatValue(
  value: number | string | null | undefined,
  format?: "number" | "tco2e" | "text"
): string {
  if (value === null || value === undefined) return "—"
  if (format === "tco2e" && typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
  }
  if (format === "text" && typeof value === "string") return value
  if (typeof value === "number") return value.toLocaleString()
  return String(value)
}

function StatCard({
  config,
  stats,
  isLoading,
}: {
  config: StatCardConfig
  stats: Record<string, unknown>
  isLoading: boolean
}) {
  const Icon = ICON_MAP[config.icon] ?? IconLeaf
  const { data: entityVcs } = useAllPolicyVcs(config.entityType)

  let displayValue: string
  if (isLoading) {
    displayValue = ""
  } else if (config.source === "count" && config.entityType) {
    displayValue = formatValue(entityVcs?.length ?? 0, config.format)
  } else if (config.source === "computed" && config.valuePath) {
    const raw = stats[config.valuePath]
    displayValue = formatValue(raw as number | string | null, config.format)
  } else {
    displayValue = "—"
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className={`size-4 ${config.iconColor ?? ""}`} />
          {config.label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {isLoading ? (
            <IconLoader className="size-4 animate-spin text-muted-foreground" />
          ) : (
            displayValue
          )}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="text-muted-foreground">{config.description}</div>
      </CardFooter>
    </Card>
  )
}

export function SectionCards() {
  const { policy } = usePolicyNetwork()
  const stats = useDashboardStats()

  const statValues: Record<string, unknown> = {
    totalERy: stats.totalERy,
    totalDevices: stats.totalDevices,
    validationStage: stats.validationStage,
    issuanceCount: stats.issuanceCount,
    projectCount: stats.projectCount,
    projectFormCount: stats.projectFormCount,
    activeProjectFormCount: stats.activeProjectFormCount,
    mrvBatchCount: stats.mrvBatchCount,
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {policy.dashboard.statCards.map((cardConfig) => (
        <StatCard
          key={cardConfig.key}
          config={cardConfig}
          stats={statValues}
          isLoading={stats.isLoading}
        />
      ))}
    </div>
  )
}
