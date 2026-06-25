"use client"

import {
  Map,
  MapControlContainer,
  MapMarker,
  MapTileLayer,
} from "@/components/ui/map"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { LatLngExpression } from "leaflet"
import { useMemo } from "react"
import { useAllPolicyVcs } from "@/hooks/usePolicyVcDocuments"
import type { VCListItem } from "@/lib/types/indexer"

interface ProjectLocation {
  id: string
  label: string
  country: string
  coordinates: LatLngExpression
}

// Static fallback locations derived from PDD country field.
// When a project_form VC is found with a matching project title/country, this
// is augmented. For now Senegal is the only deployed project.
const STATIC_LOCATIONS: ProjectLocation[] = [
  {
    id: "abc-mangrove-senegal",
    label: "ABC Mangrove Senegal",
    country: "Senegal",
    // Saloum Delta / Casamance mangrove region, Senegal
    coordinates: [13.4, -16.3],
  },
]

const MAP_CENTER: LatLngExpression = [13.4, -16.3]
const MAP_ZOOM = 5

function ProjectPin({ label, country }: { label: string; country: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute inline-flex size-8 animate-ping rounded-full bg-emerald-500 opacity-20" />
      <span className="absolute inline-flex size-5 animate-pulse rounded-full bg-emerald-500 opacity-30" />
      <span className="relative inline-flex size-3 rounded-full bg-emerald-600 shadow-lg" />
      <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md pointer-events-none">
        {country}
      </span>
    </div>
  )
}

export function ProjectGeographiesMap() {
  const { data: allVcs } = useAllPolicyVcs()

  // Compute active (non-revoked) project count using revoke detection
  const projectCount = useMemo(() => {
    if (!allVcs) return STATIC_LOCATIONS.length
    const revokedUuidSet: Record<string, boolean> = {}
    allVcs.filter(vc => vc.status === "REVOKE" && vc.uuid).forEach(vc => { revokedUuidSet[vc.uuid as string] = true })
    const byTs: Record<string, VCListItem> = {}
    allVcs.forEach(vc => { byTs[vc.consensusTimestamp] = vc })
    const revokedFormTs: Record<string, boolean> = {}
    allVcs.filter(vc => vc.options?.entityType === "project").forEach(cp => {
      if (!cp.uuid || !revokedUuidSet[cp.uuid]) return
      ;(cp.options?.relationships ?? []).forEach(relTs => {
        if (byTs[relTs]?.options?.entityType === "project_form") revokedFormTs[relTs] = true
      })
    })
    const total = allVcs.filter(vc => vc.options?.entityType === "project_form").length
    return Math.max(0, total - Object.keys(revokedFormTs).length)
  }, [allVcs])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Geographies</CardTitle>
        <CardDescription>
          Active project locations — {projectCount} active project{projectCount !== 1 ? "s" : ""} under this policy
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-3 sm:px-4">
        <div className="rounded-lg overflow-hidden border" style={{ height: "280px" }}>
          <Map
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            className="h-full w-full rounded-b-lg !rounded-t-none !min-h-0"
            scrollWheelZoom={false}
          >
            <MapTileLayer />
            {STATIC_LOCATIONS.map((loc) => (
              <MapMarker
                key={loc.id}
                position={loc.coordinates}
                icon={<ProjectPin label={loc.label} country={loc.country} />}
                iconAnchor={[16, 16]}
              />
            ))}
            <MapControlContainer className="bg-popover text-popover-foreground bottom-2 left-2 flex flex-col gap-1 rounded-md border px-3 py-2 shadow-md">
              <p className="text-xs font-medium">Project Sites</p>
              {STATIC_LOCATIONS.map((loc) => (
                <p key={loc.id} className="flex items-center gap-2 text-xs">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                  </span>
                  {loc.label}
                </p>
              ))}
            </MapControlContainer>
          </Map>
        </div>
      </CardContent>
    </Card>
  )
}
