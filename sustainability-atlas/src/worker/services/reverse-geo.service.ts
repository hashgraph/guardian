import { Injectable, Logger } from '@nestjs/common';

interface CountryFeatureBbox {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
    code: string;
    name: string;
    polygons: number[][][][];   // GeoJSON-style: [polygon][ring][vertex][lng,lat]
}

const COUNTRIES_GEOJSON_URL =
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

const countryDisplay = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * Looks up an ISO country from a (lat, lng) using bundled-at-runtime country
 * borders. The GeoJSON is fetched on first call and cached for the process
 * lifetime — there is no per-call network cost.
 *
 * If the initial fetch fails (network down, etc.) every lookup returns null
 * until the next process restart attempts the fetch again.
 */
@Injectable()
export class ReverseGeoService {
    private readonly logger = new Logger(ReverseGeoService.name);
    private features: CountryFeatureBbox[] | null = null;
    private loadingPromise: Promise<void> | null = null;

    async lookupCountry(lat: number, lng: number): Promise<{ code: string; name: string } | null> {
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        if (!isFinite(lat) || !isFinite(lng)) return null;

        await this.ensureLoaded();
        if (!this.features) return null;

        // Pass 1 — strict point-in-polygon, bbox pre-filtered.
        for (const f of this.features) {
            if (lng < f.minLng || lng > f.maxLng) continue;
            if (lat < f.minLat || lat > f.maxLat) continue;
            if (this.pointInFeature(lng, lat, f.polygons)) {
                return { code: f.code, name: f.name };
            }
        }

        // Pass 2 — coastal-tolerance fallback. The bundled GeoJSON's
        // coastline is simplified, so cities like Darwin (-12.48, 130.90)
        // sit just outside the polygon. Find the nearest country whose
        // bbox is within ~1° of the point and pick it if a vertex is within
        // the tolerance.
        const TOLERANCE_DEG = 1.0;
        const TOL_SQ = TOLERANCE_DEG * TOLERANCE_DEG;
        let best: { f: CountryFeatureBbox; d: number } | null = null;
        for (const f of this.features) {
            if (lng < f.minLng - TOLERANCE_DEG || lng > f.maxLng + TOLERANCE_DEG) continue;
            if (lat < f.minLat - TOLERANCE_DEG || lat > f.maxLat + TOLERANCE_DEG) continue;
            const d = this.minVertexDistanceSq(lng, lat, f.polygons, TOL_SQ);
            if (best === null || d < best.d) best = { f, d };
        }
        if (best && best.d <= TOL_SQ) {
            return { code: best.f.code, name: best.f.name };
        }
        return null;
    }

    /** Minimum squared distance (in degrees²) from (lng, lat) to any polygon
     * vertex. Early-exits as soon as a distance below `cap` is found. */
    private minVertexDistanceSq(lng: number, lat: number, polygons: number[][][][], cap: number): number {
        let best = Infinity;
        for (const poly of polygons) {
            for (const ring of poly) {
                for (const [vx, vy] of ring) {
                    const dx = vx - lng, dy = vy - lat;
                    const d = dx * dx + dy * dy;
                    if (d < best) {
                        best = d;
                        if (best < cap * 0.01) return best;   // very close — stop scanning
                    }
                }
            }
        }
        return best;
    }

    private async ensureLoaded(): Promise<void> {
        if (this.features) return;
        if (!this.loadingPromise) this.loadingPromise = this.load();
        await this.loadingPromise;
    }

    private async load(): Promise<void> {
        try {
            const response = await fetch(COUNTRIES_GEOJSON_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const geojson = await response.json() as {
                features?: Array<{
                    geometry?: { type?: string; coordinates?: any };
                    properties?: Record<string, any>;
                }>;
            };
            const features: CountryFeatureBbox[] = [];
            for (const feat of geojson.features ?? []) {
                const geom = feat.geometry;
                if (!geom) continue;
                const polygons: number[][][][] = geom.type === 'Polygon'
                    ? [geom.coordinates as number[][][]]
                    : geom.type === 'MultiPolygon' ? (geom.coordinates as number[][][][]) : [];
                if (polygons.length === 0) continue;

                let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                for (const poly of polygons) {
                    for (const [lng, lat] of poly[0] ?? []) {
                        if (lng < minLng) minLng = lng;
                        if (lat < minLat) minLat = lat;
                        if (lng > maxLng) maxLng = lng;
                        if (lat > maxLat) maxLat = lat;
                    }
                }
                if (minLng === Infinity) continue;

                const code = String(feat.properties?.['ISO3166-1-Alpha-3'] ?? '').toUpperCase();
                // Intl.DisplayNames for type 'region' only accepts 2-letter
                // region codes per ECMA-402, so resolve via alpha-2 and fall
                // back to the GeoJSON's "name" property if present.
                const alpha2 = String(feat.properties?.['ISO3166-1-Alpha-2'] ?? '').toUpperCase();
                if (!code) continue;
                let name = '';
                if (alpha2) {
                    try { name = countryDisplay.of(alpha2) ?? ''; } catch { /* ignore */ }
                }
                if (!name || name === alpha2) {
                    name = String(feat.properties?.['name'] ?? feat.properties?.['ADMIN'] ?? code);
                }

                features.push({ minLng, minLat, maxLng, maxLat, code, name, polygons });
            }
            this.features = features;
            this.logger.log(`ReverseGeoService loaded ${features.length} country polygons`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`ReverseGeoService failed to load country borders: ${msg} — country lookup from coordinates will be unavailable`);
            this.loadingPromise = null;   // allow a retry on next call
        }
    }

    private pointInRing(lng: number, lat: number, ring: number[][]): boolean {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [xi, yi] = ring[i];
            const [xj, yj] = ring[j];
            const intersect = ((yi > lat) !== (yj > lat))
                && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    private pointInFeature(lng: number, lat: number, polygons: number[][][][]): boolean {
        for (const poly of polygons) {
            const [outer, ...holes] = poly;
            if (outer && this.pointInRing(lng, lat, outer)) {
                if (!holes.some(h => this.pointInRing(lng, lat, h))) return true;
            }
        }
        return false;
    }
}
