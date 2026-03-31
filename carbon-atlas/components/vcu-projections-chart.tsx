"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
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
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import { useQueries } from "@tanstack/react-query"
import { getVcDocument } from "@/lib/api/vc-documents"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

const chartConfig = {
  vcu: {
    label: "Ex-Ante Removals (tCO₂e)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface YearlyVcu {
  year: number
  label: string
  vcu: number
}

export function VcuProjectionsChart() {
  const { network } = usePolicyNetwork()

  // Fetch all VCs to detect revocations
  const { data: allVcs, isLoading: loadingList } = useAllPolicyVcs()

  // Identify the active (non-revoked) project_form VCs
  const activeFormTs = useMemo(() => {
    if (!allVcs) return []
    const revokedUuids = new Set(
      allVcs.filter(vc => vc.status === "REVOKE" && vc.uuid).map(vc => vc.uuid!)
    )
    const byTs = new Map(allVcs.map(vc => [vc.consensusTimestamp, vc]))
    const revokedFormTs = new Set<string>()
    for (const cp of allVcs.filter(vc => vc.options?.entityType === "project")) {
      if (!cp.uuid || !revokedUuids.has(cp.uuid)) continue
      for (const relTs of cp.options?.relationships ?? []) {
        const rel = byTs.get(relTs)
        if (rel?.options?.entityType === "project_form") revokedFormTs.add(relTs)
      }
    }
    return allVcs
      .filter(vc => vc.options?.entityType === "project_form" && !revokedFormTs.has(vc.consensusTimestamp))
      .map(vc => vc.consensusTimestamp)
  }, [allVcs])

  // Fetch detail for active project_forms to extract VCU projections
  const detailQueries = useQueries({
    queries: activeFormTs.map(ts => ({
      queryKey: ["vc-document", network, ts],
      queryFn: () => getVcDocument(ts, network),
      staleTime: 15 * 60 * 1000,
      enabled: activeFormTs.length > 0,
    })),
  })

  const isLoading = loadingList || detailQueries.some(q => q.isLoading)

  // Aggregate yearly VCU totals across all active project_forms
  const chartData = useMemo((): YearlyVcu[] => {
    const byYear = new Map<number, number>()

    for (const q of detailQueries) {
      if (!q.data) continue
      const docs = q.data.item.documents
      if (!docs?.length) continue
      let cs: Record<string, unknown>
      try {
        cs = JSON.parse(docs[0])?.credentialSubject?.[0]
        if (!cs) continue
      } catch { continue }

      const pdi = cs.project_data_per_instance as { project_instance?: Record<string, unknown> }[] | undefined
      const pi = pdi?.[0]?.project_instance as Record<string, unknown> | undefined
      const netErr = pi?.net_ERR as Record<string, unknown> | undefined
      const individualParams = pi?.individual_parameters as Record<string, unknown> | undefined
      const bufferPct = ((individualParams?.["individual_params_buffer_%"] as number | undefined) ?? 0.13)

      const netRows = netErr?.net_ERR_calculation_per_year as {
        year_t: number; VCU?: number; NERRWE?: number; adjusted_NER_t?: number
      }[] | undefined
      if (!netRows?.length) continue

      // Project emissions for fallback estimation (same logic as PDDView VcuProjectionsTab)
      const projEmissions = pi?.project_emissions as Record<string, unknown> | undefined
      const yearlyWps = (projEmissions?.yearly_data_for_project_GHG_emissions as { year_t: number; GHG_WPS?: number }[] | undefined) ?? []
      const wpsByCalYear = new Map(yearlyWps.map(r => [r.year_t, r.GHG_WPS ?? 0]))

      // First calendar year from baseline data
      const bslEmissions = pi?.baseline_emissions as Record<string, unknown> | undefined
      const yearlyBsl = (bslEmissions?.yearly_data_for_baseline_GHG_emissions as { year_t: number }[] | undefined) ?? []
      const firstCalYear = yearlyBsl[0]?.year_t ?? 2022

      for (const row of netRows) {
        const calYear = firstCalYear + row.year_t - 1
        // Use stored VCU if non-zero, otherwise estimate from project emissions
        const storedVcu = row.VCU ?? 0
        const absWps = Math.abs(wpsByCalYear.get(calYear) ?? 0)
        const vcu = storedVcu !== 0 ? storedVcu : absWps * (1 - bufferPct)
        byYear.set(calYear, (byYear.get(calYear) ?? 0) + vcu)
      }
    }

    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, vcu]) => ({
        year,
        label: String(year),
        vcu: Math.round(vcu),
      }))
  }, [detailQueries])

  const currentYear = new Date().getFullYear()

  // Only label every 5 years to avoid clutter across 40 years
  const tickFormatter = (label: string) => {
    const y = parseInt(label)
    return y % 5 === 0 ? label : ""
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Ex-Ante VCU Projections</CardTitle>
        <CardDescription>
          Expected annual removals (tCO₂e) across all registered projects · 2022–2061
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading && (
          <div className="flex items-center justify-center h-[260px] gap-2 text-muted-foreground">
            <IconLoader className="size-4 animate-spin" />
            <span className="text-sm">Loading projections…</span>
          </div>
        )}
        {!isLoading && chartData.length > 0 && (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full"
          >
            <BarChart data={chartData} barCategoryGap="8%">
              <defs>
                <linearGradient id="fillVcu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-vcu)" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="var(--color-vcu)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={tickFormatter}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={58}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString()
                }
              />
              <ReferenceLine
                x={String(currentYear)}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `Year ${label}`}
                    formatter={(value) => (
                      <span className="font-mono font-medium">
                        {Number(value).toLocaleString("en-US")} tCO₂e
                      </span>
                    )}
                    indicator="dot"
                  />
                }
              />
              <Bar dataKey="vcu" fill="url(#fillVcu)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        {!isLoading && chartData.length === 0 && (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            No projection data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
