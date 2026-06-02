"use client"

import { useMemo, useState } from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
} from "react-simple-maps"
import { IconLoader } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useProjectsByCountryMap } from "@/hooks/useMarketData"
import type { CountryMapDataPoint } from "@/lib/types/market"

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Natural Earth ISO numeric → ISO alpha-3 for matching our API data
// react-simple-maps Geography.id is the ISO 3166-1 numeric code as string
const NUMERIC_TO_ISO3: Record<string, string> = {
  "004": "AFG", "008": "ALB", "012": "DZA", "024": "AGO", "032": "ARG",
  "051": "ARM", "036": "AUS", "040": "AUT", "031": "AZE", "044": "BHS",
  "048": "BHR", "050": "BGD", "056": "BEL", "084": "BLZ", "204": "BEN",
  "068": "BOL", "070": "BIH", "072": "BWA", "076": "BRA", "096": "BRN",
  "100": "BGR", "854": "BFA", "108": "BDI", "132": "CPV", "116": "KHM",
  "120": "CMR", "124": "CAN", "140": "CAF", "148": "TCD", "152": "CHL",
  "156": "CHN", "170": "COL", "174": "COM", "178": "COG", "180": "COD",
  "188": "CRI", "384": "CIV", "191": "HRV", "196": "CYP", "203": "CZE",
  "208": "DNK", "262": "DJI", "214": "DOM", "218": "ECU", "818": "EGY",
  "222": "SLV", "226": "GNQ", "232": "ERI", "233": "EST", "231": "ETH",
  "242": "FJI", "246": "FIN", "250": "FRA", "266": "GAB", "270": "GMB",
  "268": "GEO", "276": "DEU", "288": "GHA", "300": "GRC", "320": "GTM",
  "324": "GIN", "624": "GNB", "328": "GUY", "332": "HTI", "340": "HND",
  "344": "HKG", "348": "HUN", "352": "ISL", "356": "IND", "360": "IDN",
  "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR", "380": "ITA",
  "388": "JAM", "392": "JPN", "400": "JOR", "398": "KAZ", "404": "KEN",
  "-99": "XKX", "414": "KWT", "417": "KGZ", "418": "LAO", "428": "LVA",
  "422": "LBN", "426": "LSO", "430": "LBR", "434": "LBY", "440": "LTU",
  "442": "LUX", "450": "MDG", "454": "MWI", "458": "MYS", "466": "MLI",
  "478": "MRT", "480": "MUS", "484": "MEX", "496": "MNG", "499": "MNE",
  "504": "MAR", "508": "MOZ", "104": "MMR", "516": "NAM", "524": "NPL",
  "528": "NLD", "540": "NCL", "554": "NZL", "558": "NIC", "562": "NER",
  "566": "NGA", "807": "MKD", "578": "NOR", "512": "OMN", "586": "PAK",
  "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER", "608": "PHL",
  "616": "POL", "620": "PRT", "634": "QAT", "642": "ROU", "643": "RUS",
  "646": "RWA", "682": "SAU", "686": "SEN", "688": "SRB", "694": "SLE",
  "702": "SGP", "703": "SVK", "705": "SVN", "706": "SOM", "710": "ZAF",
  "410": "KOR", "724": "ESP", "144": "LKA", "736": "SDN", "740": "SUR",
  "752": "SWE", "756": "CHE", "760": "SYR", "158": "TWN", "762": "TJK",
  "834": "TZA", "764": "THA", "626": "TLS", "768": "TGO", "780": "TTO",
  "788": "TUN", "792": "TUR", "800": "UGA", "804": "UKR", "784": "ARE",
  "826": "GBR", "840": "USA", "858": "URY", "860": "UZB", "862": "VEN",
  "704": "VNM", "887": "YEM", "894": "ZMB", "716": "ZWE",
}

function getColorScale(value: number, max: number): string {
  if (value === 0) return "var(--muted)"
  const t = Math.log(value + 1) / Math.log(max + 1)
  // Interpolate from light teal to deep teal
  const lightness = Math.round(85 - t * 55)
  return `hsl(168, 60%, ${lightness}%)`
}

function fmtBigNum(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toString()
}

export function WorldMapChart() {
  const { data, isLoading } = useProjectsByCountryMap()
  const [tooltip, setTooltip] = useState<CountryMapDataPoint | null>(null)

  const countryMap = useMemo(() => {
    const map = new Map<string, CountryMapDataPoint>()
    for (const d of data ?? []) {
      map.set(d.iso3, d)
    }
    return map
  }, [data])

  const maxCount = useMemo(() => {
    let max = 0
    for (const d of data ?? []) {
      if (d.count > max) max = d.count
    }
    return max
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <IconLoader className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Global Project Distribution</CardTitle>
        <CardDescription>
          Carbon projects by country — darker shading indicates more projects
        </CardDescription>
      </CardHeader>
      <CardContent className="relative px-2 sm:px-6">
        {tooltip && (
          <div className="absolute top-2 right-6 z-10 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
            <div className="font-semibold">{tooltip.country}</div>
            <div className="text-muted-foreground">
              {tooltip.count.toLocaleString()} projects
            </div>
            <div className="text-muted-foreground text-xs">
              Issued: {fmtBigNum(tooltip.issued)} · Retired: {fmtBigNum(tooltip.retired)}
            </div>
          </div>
        )}
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          height={400}
          width={800}
          className="w-full h-auto"
        >
          <Sphere stroke="var(--border)" strokeWidth={0.5} fill="transparent" id="sphere" />
          <Graticule stroke="var(--border)" strokeWidth={0.3} />
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso3 = NUMERIC_TO_ISO3[geo.id] ?? ""
                const entry = countryMap.get(iso3)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={entry ? getColorScale(entry.count, maxCount) : "var(--muted)"}
                    stroke="var(--border)"
                    strokeWidth={0.4}
                    style={{
                      hover: { fill: "hsl(168, 70%, 40%)", stroke: "var(--foreground)" },
                    }}
                    onMouseEnter={() => entry && setTooltip(entry)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </CardContent>
    </Card>
  )
}
