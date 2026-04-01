"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
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
import {
  useIssuancesByVintage,
  useProjectsByCategory,
  useProjectsByCountry,
  useStatusBreakdown,
  useCreditsRemainingByVintage,
  useReductionRemovalBreakdown,
} from "@/hooks/useMarketData"

const CATEGORY_COLORS: Record<string, string> = {
  "renewable-energy": "var(--chart-1)",
  "fuel-switching": "var(--chart-2)",
  "energy-efficiency": "var(--chart-3)",
  "forest": "var(--chart-4)",
  "ghg-management": "var(--chart-5)",
  "agriculture": "hsl(142, 71%, 45%)",
  "land-use": "hsl(45, 93%, 47%)",
  "carbon-capture": "hsl(280, 65%, 60%)",
  "unknown": "hsl(0, 0%, 60%)",
}

const STATUS_COLORS: Record<string, string> = {
  crediting: "hsl(142, 71%, 45%)",
  registered: "hsl(217, 91%, 60%)",
  listed: "hsl(45, 93%, 47%)",
  under_validation: "hsl(32, 95%, 44%)",
  under_development: "hsl(280, 65%, 60%)",
  withdrawn: "hsl(0, 72%, 51%)",
  inactive: "hsl(0, 0%, 60%)",
  on_hold: "hsl(0, 0%, 45%)",
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-[340px]">
        <IconLoader className="size-5 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  )
}

function fmtBigNum(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toString()
}

// ── Issuances by Vintage ───────────────────────────────────────────────

const vintageConfig = {
  issued: { label: "Issued", color: "var(--chart-1)" },
  retired: { label: "Retired", color: "var(--chart-2)" },
} satisfies ChartConfig

function VintageChart() {
  const { data, isLoading } = useIssuancesByVintage()
  if (isLoading) return <LoadingCard />

  const chartData = (data ?? [])
    .filter((d) => d.vintage >= 2005 && d.vintage <= new Date().getFullYear() + 1)
    .map((d) => ({ ...d, label: String(d.vintage) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issuances & Retirements by Vintage</CardTitle>
        <CardDescription>Credits issued and retired by vintage year</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={vintageConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={chartData} barCategoryGap="15%">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickFormatter={fmtBigNum}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => `Vintage ${p?.[0]?.payload?.label ?? ""}`}
                  formatter={(v) => (
                    <span className="font-mono font-medium">
                      {Number(v).toLocaleString()} tCO₂e
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="issued" fill="var(--color-issued)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="retired" fill="var(--color-retired)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Projects by Category ───────────────────────────────────────────────

function CategoryChart() {
  const { data, isLoading } = useProjectsByCategory()
  if (isLoading) return <LoadingCard />

  const chartData = (data ?? []).map((d) => ({
    ...d,
    fill: CATEGORY_COLORS[d.category] ?? "var(--chart-1)",
    label: d.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }))

  const categoryConfig = Object.fromEntries(
    chartData.map((d) => [d.category, { label: d.label, color: d.fill }])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects by Category</CardTitle>
        <CardDescription>Distribution of projects across categories</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={categoryConfig} className="aspect-auto h-[260px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v, _n, item) => (
                    <span className="font-medium">
                      {item?.payload?.label}: {Number(v).toLocaleString()}
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Projects by Country ────────────────────────────────────────────────

const countryConfig = {
  count: { label: "Projects", color: "var(--chart-1)" },
} satisfies ChartConfig

function CountryChart() {
  const { data, isLoading } = useProjectsByCountry(10)
  if (isLoading) return <LoadingCard />

  const chartData = (data ?? []).slice(0, 10).reverse()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Countries</CardTitle>
        <CardDescription>Countries with the most carbon projects</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={countryConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmtBigNum} />
            <YAxis
              type="category"
              dataKey="country"
              tickLine={false}
              axisLine={false}
              width={80}
              tickMargin={4}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v) => (
                    <span className="font-mono font-medium">{Number(v).toLocaleString()} projects</span>
                  )}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Status Breakdown ───────────────────────────────────────────────────

function StatusChart() {
  const { data, isLoading } = useStatusBreakdown()
  if (isLoading) return <LoadingCard />

  // Aggregate across registries
  const byStatus: Record<string, number> = {}
  for (const item of data ?? []) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + item.count
  }

  const chartData = Object.entries(byStatus)
    .map(([status, count]) => ({
      status,
      count,
      fill: STATUS_COLORS[status] ?? "var(--chart-1)",
      label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
    .sort((a, b) => b.count - a.count)

  const statusConfig = Object.fromEntries(
    chartData.map((d) => [d.status, { label: d.label, color: d.fill }])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Breakdown</CardTitle>
        <CardDescription>Project pipeline stages across all registries</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={statusConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-30}
              textAnchor="end"
              height={60}
              fontSize={11}
            />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmtBigNum} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v) => (
                    <span className="font-mono font-medium">{Number(v).toLocaleString()} projects</span>
                  )}
                />
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Credits Remaining by Vintage ──────────────────────────────────────

const remainingConfig = {
  remaining: { label: "Remaining", color: "hsl(168, 60%, 45%)" },
  retired: { label: "Retired", color: "var(--chart-2)" },
} satisfies ChartConfig

function CreditsRemainingChart() {
  const { data, isLoading } = useCreditsRemainingByVintage()
  if (isLoading) return <LoadingCard />

  const chartData = (data ?? [])
    .filter((d) => d.vintage >= 2005 && d.vintage <= new Date().getFullYear() + 1)
    .map((d) => ({ ...d, label: String(d.vintage) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits Remaining by Vintage</CardTitle>
        <CardDescription>Issued minus retired — available credits per vintage year</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={remainingConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={chartData} barCategoryGap="15%">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickFormatter={fmtBigNum}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => `Vintage ${p?.[0]?.payload?.label ?? ""}`}
                  formatter={(v) => (
                    <span className="font-mono font-medium">
                      {Number(v).toLocaleString()} tCO₂e
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="retired" stackId="a" fill="var(--color-retired)" />
            <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Reduction / Removal Breakdown ─────────────────────────────────────

const RR_COLORS: Record<string, string> = {
  reduction: "hsl(217, 91%, 60%)",
  impermanent_removal: "hsl(142, 71%, 45%)",
  long_duration_removal: "hsl(280, 65%, 60%)",
  mixed: "hsl(45, 93%, 47%)",
}

const RR_LABELS: Record<string, string> = {
  reduction: "Reduction",
  impermanent_removal: "Impermanent Removal",
  long_duration_removal: "Long-Duration Removal",
  mixed: "Mixed",
}

function ReductionRemovalChart() {
  const { data, isLoading } = useReductionRemovalBreakdown()
  if (isLoading) return <LoadingCard />

  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: RR_LABELS[d.reduction_removal] ?? d.reduction_removal,
    fill: RR_COLORS[d.reduction_removal] ?? "var(--chart-1)",
  }))

  const rrConfig = Object.fromEntries(
    chartData.map((d) => [d.reduction_removal, { label: d.label, color: d.fill }])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reduction vs Removal</CardTitle>
        <CardDescription>Classification of projects by emission impact type</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={rrConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmtBigNum} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v, _n, item) => (
                    <span className="font-mono font-medium">
                      {Number(v).toLocaleString()} projects
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Main export ────────────────────────────────────────────────────────

export function MarketCharts() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      <VintageChart />
      <CreditsRemainingChart />
      <CategoryChart />
      <ReductionRemovalChart />
      <CountryChart />
      <StatusChart />
    </div>
  )
}
