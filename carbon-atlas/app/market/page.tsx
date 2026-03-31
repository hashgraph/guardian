import { MarketStatCards } from "@/components/market/market-stat-cards"
import { MarketCharts } from "@/components/market/market-charts"
import { WorldMapChart } from "@/components/market/world-map-chart"

export default function MarketDashboardPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <MarketStatCards />
      <div className="px-4 lg:px-6">
        <WorldMapChart />
      </div>
      <MarketCharts />
    </div>
  )
}
