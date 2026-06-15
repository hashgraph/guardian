import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Emission reduction trends and issuance history
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            tCO₂e over time charts, per monitoring period and project developer breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-sm">
            Analytics charts — future feature
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
