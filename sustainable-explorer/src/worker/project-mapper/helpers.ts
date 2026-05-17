import { DataSource } from 'typeorm';
import { FieldDef, MethodEntry, ResolutionMaps, ResolvedFieldPaths } from './types';
import { PROJECT_EXTRACT_FIELDS } from './project-fields';

// ---------------------------------------------------------------------------
// Slug utility
// ---------------------------------------------------------------------------

export function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Country code → name resolution
// ---------------------------------------------------------------------------

const countryDisplay = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * If the value looks like an ISO 3166-1 alpha-2 or alpha-3 code, resolve it
 * to a human-readable country name. Otherwise return the value unchanged.
 */
export function resolveCountryName(raw: string): string {
    const trimmed = raw.trim();
    if (!/^[A-Za-z]{2,3}$/.test(trimmed)) return trimmed;
    try {
        const resolved = countryDisplay.of(trimmed.toUpperCase());
        if (resolved && resolved.toUpperCase() !== trimmed.toUpperCase()) return resolved;
    } catch {
        // Invalid code — fall through and return the raw value.
    }
    return trimmed;
}

// ---------------------------------------------------------------------------
// Sector normalisation
// ---------------------------------------------------------------------------

export const SECTOR_KEYWORD_MAP: Array<{ sector: string; keywords: string[] }> = [
    {
        sector: 'Energy',
        keywords: [
            'energy',
            'industries',
            'distribution',
            'demand',
        ],
    },
    {
        sector: 'Transport',
        keywords: [
            'transport',
        ],
    },
    {
        sector: 'Waste',
        keywords: [
            'waste',
            'handling',
            'disposal',
        ],
    },
    {
        sector: 'Land Use & Forestry',
        keywords: [
            'agriculture',
            'afforestation',
            'reforestation',
            'forest',
            'forestry',
            'land',
            'use',
        ],
    },
    {
        sector: 'Industrial Process',
        keywords: [
            'chemical',
            'manufacturing',
            'metal',
            'production',
            'industrial',
        ],
    },
    {
        sector: 'Fugitive Emissions',
        keywords: [
            'fugitive',
            'emissions',
            'solid',
            'fuels',
            'oil',
            'gas',
            'halocarbons',
            'sulphur',
        ],
    },
    {
        sector: 'Others',
        keywords: [
            'construction',
            'mining',
            'mineral',
            'production',
            'solvents',
            'use',
            'geological',
            'carbon',
            'storage',
            'engineered',
            'removals',
            'oceans',
            'marine',
            'resources',
        ],
    },
];

export function normalizeSector(inputs: string[]): string {
    for (const input of inputs) {
        const lower = input.toLowerCase();
        for (const { sector, keywords } of SECTOR_KEYWORD_MAP) {
            if (keywords.some(kw => lower.includes(kw))) return sector;
        }
    }
    return inputs.length > 0 ? 'Others' : '';
}

// ---------------------------------------------------------------------------
// Methodology resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the methodology name and registry DID for a VC by walking the topic
 * parent chain up to 12 hops. Checks instance-topic map first, then
 * policy-topic map, then user-topic map (with fuzzy developer-name matching
 * as a tie-breaker when multiple policies exist under the same user topic).
 */
export function resolveMethod(
    topicId: string,
    developer: string,
    maps: ResolutionMaps,
): MethodEntry {
    let tid: string | undefined = topicId;
    const visited: string[] = [];
    for (let i = 0; i < 12; i++) {
        if (!tid) break;
        if (maps.instToMethod[tid]) return maps.instToMethod[tid];
        if (maps.policyTopicToMethod[tid]) return maps.policyTopicToMethod[tid];
        visited.push(tid);
        tid = maps.parentMap[tid];
    }
    for (const anc of visited) {
        const cands = maps.userMethods[anc] ?? [];
        if (cands.length > 0) {
            const devLower = developer.toLowerCase();
            for (const c of cands) {
                if (c.name && devLower.includes(c.name.toLowerCase())) return c;
            }
            if (cands.length === 1) return cands[0];
        }
    }
    return { name: '', registryDid: '', policyTopicId: '' };
}

// ---------------------------------------------------------------------------
// Schema document parsing
// ---------------------------------------------------------------------------

export function parseSchemaDoc(doc: unknown): Record<string, any> {
    if (!doc) return {};
    if (typeof doc === 'string') {
        try { return JSON.parse(doc); } catch { return {}; }
    }
    return typeof doc === 'object' ? (doc as Record<string, any>) : {};
}

export function findGeoJsonDefKey(doc: Record<string, any>): string | null {
    const defs = doc['$defs'] ?? doc['definitions'] ?? {};
    for (const [k, v] of Object.entries(defs)) {
        if (v && typeof v === 'object') {
            const props = (v as any).properties ?? {};
            if ('type' in props && 'coordinates' in props) return k;
        }
    }
    return null;
}

export function isGeoJsonProperty(fdef: Record<string, any>, geoDefKey?: string | null): boolean {
    const ref: string = fdef['$ref'] ?? '';
    // Guardian uses "#GeoJSON" (non-standard) — check string directly
    if (ref && ref.includes('GeoJSON')) return true;
    if (geoDefKey && ref.includes(geoDefKey)) return true;
    if (['geojson', 'geo-json'].includes((fdef['format'] ?? '').toLowerCase())) return true;
    const props = fdef['properties'] ?? {};
    if ('type' in props && 'coordinates' in props) return true;
    for (const key of ['oneOf', 'anyOf'] as const) {
        for (const item of (fdef[key] ?? []) as Record<string, any>[]) {
            if (isGeoJsonProperty(item, geoDefKey)) return true;
        }
    }
    const comment: string = fdef['$comment'] ?? '';
    if (typeof comment === 'string' && comment.replace(/\s/g, '').includes('"customType":"geo"')) return true;
    return false;
}

// ---------------------------------------------------------------------------
// Coordinate extraction
// ---------------------------------------------------------------------------

/**
 * GeoJSON standard is [lng, lat], but some Guardian VCs store [lat, lng].
 * If the second element exceeds ±90 (impossible latitude) and the first does not,
 * the pair is [lat, lng] — swap it to canonical [lng, lat].
 */
export function normaliseLngLat(c: [number, number]): [number, number] {
    if (Math.abs(c[1]) > 90 && Math.abs(c[0]) <= 90) return [c[1], c[0]];
    return c;
}

export function ringCentroid(ring: number[][]): [number, number] | null {
    if (!Array.isArray(ring) || ring.length === 0) return null;
    let sumLng = 0, sumLat = 0, count = 0;
    for (const pt of ring) {
        if (Array.isArray(pt) && pt.length >= 2) {
            sumLng += pt[0];
            sumLat += pt[1];
            count++;
        }
    }
    return count > 0 ? [sumLng / count, sumLat / count] : null;
}

/**
 * Extracts a representative [lng, lat] pair from any GeoJSON geometry.
 * Point → coordinates directly.
 * Polygon / MultiLineString → centroid of the first ring.
 * MultiPolygon → centroid of the first polygon's outer ring.
 * LineString / MultiPoint → midpoint coordinate.
 */
export function extractLatLng(geo: Record<string, any>): [number, number] | null {
    const type: string = geo['type'] ?? '';
    const coords: unknown = geo['coordinates'];

    if (type === 'Point') {
        const c = coords as number[];
        if (!Array.isArray(c) || c.length < 2) return null;
        return normaliseLngLat([c[0], c[1]]);
    }

    if (type === 'LineString' || type === 'MultiPoint') {
        const ring = coords as number[][];
        if (!Array.isArray(ring) || ring.length === 0) return null;
        const mid = ring[Math.floor(ring.length / 2)];
        if (!Array.isArray(mid) || mid.length < 2) return null;
        return normaliseLngLat([mid[0], mid[1]]);
    }

    if (type === 'Polygon' || type === 'MultiLineString') {
        const rings = coords as number[][][];
        if (!Array.isArray(rings) || rings.length === 0) return null;
        const c = ringCentroid(rings[0]);
        return c ? normaliseLngLat(c) : null;
    }

    if (type === 'MultiPolygon') {
        const polys = coords as number[][][][];
        if (!Array.isArray(polys) || polys.length === 0) return null;
        const c = ringCentroid(polys[0][0]);
        return c ? normaliseLngLat(c) : null;
    }

    return null;
}

// ---------------------------------------------------------------------------
// Shared DB helpers
// ---------------------------------------------------------------------------

/**
 * Loads all methodology/registry lookup tables needed for project resolution.
 * Runs Steps C and D from the project-building pipeline.
 * Returns the resolution maps and the per-methodology sectoralScope map.
 */
export async function loadResolutionMaps(
    dataSource: DataSource,
): Promise<{ maps: ResolutionMaps; methodScopeMap: Record<string, string[]> }> {
    const [instPolicies, parentRows]: [
        Array<{
            instance_topic: string | null;
            policy_topic: string;
            policy_name: string | null;
            registry_did: string | null;
        }>,
        Array<{ topicId: string; parent_id: string | null }>,
    ] = await Promise.all([
        dataSource.query(`
            SELECT
                options->>'instanceTopicId' AS instance_topic,
                "topicId"                   AS policy_topic,
                options->>'name'            AS policy_name,
                owner                       AS registry_did
            FROM message
            WHERE type = 'Instance-Policy' AND action = 'publish-policy'
        `),
        dataSource.query(`
            SELECT "topicId", options->>'parentId' AS parent_id
            FROM message
            WHERE type = 'Topic' AND options->>'parentId' IS NOT NULL
        `),
    ]);

    const instToMethod: Record<string, MethodEntry> = {};
    const policyTopicToMethod: Record<string, MethodEntry> = {};
    const parentMap: Record<string, string> = {};
    const userMethods: Record<string, MethodEntry[]> = {};

    for (const r of instPolicies) {
        const entry: MethodEntry = {
            name: r.policy_name ?? '',
            registryDid: r.registry_did ?? '',
            policyTopicId: r.policy_topic,
        };
        if (r.instance_topic) instToMethod[r.instance_topic] = entry;
        if (r.policy_topic) policyTopicToMethod[r.policy_topic] = entry;
    }
    for (const r of parentRows) {
        if (r.parent_id) parentMap[r.topicId] = r.parent_id;
    }
    for (const r of instPolicies) {
        const ut = r.policy_topic ? parentMap[r.policy_topic] : undefined;
        if (ut) {
            if (!userMethods[ut]) userMethods[ut] = [];
            userMethods[ut].push({
                name: r.policy_name ?? '',
                registryDid: r.registry_did ?? '',
                policyTopicId: r.policy_topic,
            });
        }
    }

    const maps: ResolutionMaps = { instToMethod, policyTopicToMethod, parentMap, userMethods };

    // Step D — sectoralScopes map derived from policy.policyMapping entries
    // where the extract field key is 'sectoralScopes' and source is 'policyJson'.
    const methScopeRows: Array<{ topicId: string; policyMapping: unknown }> =
        await dataSource.query(`
            SELECT
                "policyTopicId" AS "topicId",
                "policyMapping" AS "policyMapping"
            FROM policy
            WHERE "decodeStatus" = 'decoded'
              AND "policyMapping" IS NOT NULL
              AND "policyMapping" ? 'sectoralScopes'
        `);

    const methodScopeMap: Record<string, string[]> = {};
    for (const row of methScopeRows) {
        if (!row.topicId) continue;
        try {
            const mapping = typeof row.policyMapping === 'string'
                ? JSON.parse(row.policyMapping)
                : row.policyMapping;
            if (!mapping || typeof mapping !== 'object') continue;
            const entries = (mapping as Record<string, unknown>)['sectoralScopes'];
            if (!Array.isArray(entries)) continue;
            const scopes: string[] = [];
            for (const entry of entries) {
                if (entry && typeof entry === 'object') {
                    const val = (entry as Record<string, unknown>)['schemaName'];
                    if (typeof val === 'string' && val) scopes.push(val);
                }
            }
            if (scopes.length > 0) methodScopeMap[row.topicId] = scopes;
        } catch { /* ignore malformed */ }
    }

    return { maps, methodScopeMap };
}

/**
 * Resolves project property names to their schema field keys by running the
 * keyword-matching logic once against fieldMap titles and descriptions.
 * Driven entirely by PROJECT_EXTRACT_FIELDS — no hardcoded keyword lists.
 */
export function resolveFieldPaths(fieldMap: Record<string, FieldDef>): ResolvedFieldPaths {
    const find = (keywords: string[], exclude: string[] = []): string | null => {
        for (const [fk, fd] of Object.entries(fieldMap)) {
            if (fd.isGeoJson) continue;
            const searchable = `${fd.title} ${fd.description}`.toLowerCase();
            if (
                keywords.some(kw => searchable.includes(kw)) &&
                !exclude.some(ex => searchable.includes(ex))
            ) return fk;
        }
        return null;
    };

    const result: Partial<ResolvedFieldPaths> = {};
    for (const field of PROJECT_EXTRACT_FIELDS) {
        if (field.key === 'geo') continue; // geo is handled as geoKey/geoSection, not a text field
        result[field.key] = find(field.keywords, field.exclude ?? []);
    }

    return result as ResolvedFieldPaths;
}
