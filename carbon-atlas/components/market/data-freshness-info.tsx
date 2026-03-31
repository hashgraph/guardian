"use client"

import { IconClock } from "@tabler/icons-react"
import { useMarketStats } from "@/hooks/useMarketData"

function fmtDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    })
  } catch {
    return iso
  }
}

interface Props {
  className?: string
}

export function DataFreshnessInfo({ className = "" }: Props) {
  const { data: stats, isLoading } = useMarketStats()

  if (isLoading || !stats?.last_synced_at) return null

  return (
    <p className={`flex items-center gap-1.5 text-xs text-muted-foreground/70 ${className}`}>
      <IconClock className="size-3 shrink-0" />
      Data last synced: {fmtDate(stats.last_synced_at)}
    </p>
  )
}
