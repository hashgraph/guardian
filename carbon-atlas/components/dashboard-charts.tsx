"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { IconLoader } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DeviceMap } from "@/components/device-map"
import { useDashboardStats, type IssuanceDataPoint } from "@/hooks/useDashboardStats"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"
import type { ChartSlot } from "@/lib/policies/types"

const chartConfig = {
  ery: {
    label: "Projected Emission Reductions (tCO₂e)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const START_YEAR = 2021

function buildTimelineData(raw: IssuanceDataPoint[]) {
  const currentYear = new Date().getFullYear()
  const endYear = Math.max(currentYear + 1, START_YEAR + 5)

  const points: { year: number; label: string; ery: number }[] = []

  for (let y = START_YEAR; y <= endYear; y++) {
    const yearIssuances = raw.filter(
      (d) => new Date(d.date).getFullYear() === y
    )
    const yearEry = yearIssuances.reduce((sum, d) => sum + d.ery, 0)
    points.push({
      year: y,
      label: String(y),
      ery: yearEry,
    })
  }

  return points
}

function IssuanceChart({ data }: { data: IssuanceDataPoint[] }) {
  const timelineData = buildTimelineData(data)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Projected Emission Reductions Over Time</CardTitle>
        <CardDescription>tCO₂e per year from approved monitoring reports</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <BarChart data={timelineData} barCategoryGap="25%">
            <defs>
              <linearGradient id="fillEry" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-ery)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-ery)"
                  stopOpacity={0.4}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString()
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload
                    return item ? `Year ${item.label}` : ""
                  }}
                  formatter={(value) => {
                    const n = Number(value)
                    if (n === 0) {
                      return (
                        <span className="text-muted-foreground text-xs">
                          No issuances
                        </span>
                      )
                    }
                    return (
                      <span className="font-mono font-medium">
                        {n.toLocaleString("en-US", { maximumFractionDigits: 2 })} tCO₂e
                      </span>
                    )
                  }}
                  indicator="dot"
                />
              }
            />
            <Bar
              dataKey="ery"
              fill="url(#fillEry)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function ProjectOverviewChart() {
  const { validationStage, projectFormCount, projectCount, issuanceCount } =
    useDashboardStats()

  const stages = [
    { name: "Submitted", count: projectFormCount, active: true },
    { name: "Validated", count: projectCount, active: projectCount > 0 },
    { name: "Issued", count: issuanceCount, active: issuanceCount > 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Lifecycle</CardTitle>
        <CardDescription>
          Current stage: {validationStage}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {stages.map((stage, i) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div
                className={`px-3 py-2 rounded-lg border text-sm ${
                  stage.active
                    ? "bg-primary/10 border-primary text-primary font-medium"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {stage.name}
                {stage.count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({stage.count})
                  </span>
                )}
              </div>
              {i < stages.length - 1 && (
                <div className="w-6 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSlotRenderer({ slot }: { slot: ChartSlot }) {
  const { chartData } = useDashboardStats()
  switch (slot) {
    case "emission-timeline":
      return <IssuanceChart data={chartData} />
    case "device-map":
      return <DeviceMap />
    case "project-overview":
      return <ProjectOverviewChart />
    case "none":
      return null
    default:
      return null
  }
}

export function DashboardCharts() {
  const { policy } = usePolicyNetwork()
  const { isLoading } = useDashboardStats()
  const charts = policy.dashboard.charts

  if (charts.length === 0 || charts.every((c) => c === "none")) return null

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 gap-4 px-4 lg:px-6 ${charts.length > 1 ? "@xl/main:grid-cols-2" : ""}`}>
        {charts.filter((c) => c !== "none").map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-[340px]">
              <IconLoader className="size-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 gap-4 px-4 lg:px-6 ${charts.length > 1 ? "@xl/main:grid-cols-2" : ""}`}>
      {charts.map((slot, i) => (
        <ChartSlotRenderer key={`${slot}-${i}`} slot={slot} />
      ))}
    </div>
  )
}
