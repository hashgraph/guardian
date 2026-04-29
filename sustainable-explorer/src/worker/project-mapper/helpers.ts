import { DataSource } from 'typeorm';
import { MethodEntry, ProjectRecord, ResolutionMaps } from './types';

// ---------------------------------------------------------------------------
// Slug utility
// ---------------------------------------------------------------------------

export function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Sector normalisation
// ---------------------------------------------------------------------------

export const SECTOR_KEYWORD_MAP: Array<{ sector: string; keywords: string[] }> = [
    { sector: 'Energy', keywords: ['energy'] },
    { sector: 'Transport', keywords: ['transport'] },
    { sector: 'Waste', keywords: ['waste'] },
    {
        sector: 'Nature Based Solutions',
        keywords: [
            'afforestation', 'reforestation', 'redd', 'forest', 'agriculture',
            'land use', 'blue carbon', 'wetland', 'coastal', 'marine',
            'grassland', 'peatland', 'restoration',
        ],
    },
    {
        sector: 'Industrial Process',
        keywords: [
            'manufacturing', 'chemical', 'construction', 'mining',
            'metal', 'fugitive', 'solvent', 'industrial',
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

    // Step D — sectoralScopes map from METHODOLOGY rows
    const methScopeRows: Array<{ topicId: string; sectoralScopes: unknown }> =
        await dataSource.query(`
            SELECT
                "businessData"->>'topicId'       AS "topicId",
                "businessData"->'sectoralScopes' AS "sectoralScopes"
            FROM business_view
            WHERE "viewType" = 'METHODOLOGY'
              AND "businessData"->>'topicId' IS NOT NULL
              AND "businessData"->'sectoralScopes' IS NOT NULL
        `);

    const methodScopeMap: Record<string, string[]> = {};
    for (const row of methScopeRows) {
        if (!row.topicId) continue;
        try {
            const parsed = typeof row.sectoralScopes === 'string'
                ? JSON.parse(row.sectoralScopes)
                : row.sectoralScopes;
            if (Array.isArray(parsed)) {
                methodScopeMap[row.topicId] = parsed.filter(
                    (s): s is string => typeof s === 'string',
                );
            }
        } catch { /* ignore malformed */ }
    }

    return { maps, methodScopeMap };
}

/**
 * Upserts all project rows from projectMap into business_view and removes any
 * stale PROJECT rows that are no longer in the current result set.
 * Corresponds to Step G of the project-building pipeline.
 */
export async function upsertProjectRows(
    dataSource: DataSource,
    projectMap: Map<string, ProjectRecord>,
): Promise<void> {
    const validTimestamps: string[] = [];

    for (const proj of projectMap.values()) {
        const businessData = {
            name: proj.name,
            country: proj.country,
            lat: proj.lat,
            lng: proj.lng,
            methodology: proj.methodology,
            methodologyId: proj.methodologyId,
            developer: proj.developer,
            credits: proj.credits,
            status: 'Issuing',
            vintage: proj.vintage,
            sdgs: proj.sdgs,
            cobenefits: proj.cobenefits,
            scale: proj.scale,
            category: proj.category,
            sector: proj.sector,
            sectoralScope: proj.sectoralScope,
            createdAt: proj.createdAt,
            creditingPeriodEnd: proj.creditingPeriodEnd,
            topicId: proj.topicId,
            policyTopicId: proj.policyTopicId,
            vcCount: proj.vcCount,
        };

        const searchText = [
            proj.name,
            proj.developer,
            proj.country ?? '',
            proj.methodology,
            proj.category ?? '',
            proj.cobenefits ?? '',
        ]
            .filter(Boolean)
            .join(' ');

        await dataSource.query(
            `
            INSERT INTO business_view (
                "sourceTimestamp",
                "viewType",
                "displayName",
                "registryDid",
                "relatedTopicId",
                "businessData",
                "searchText",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            ) VALUES ($1, 'PROJECT', $2, $3, $4, $5, $6, EXTRACT(EPOCH FROM NOW())::bigint, NOW(), NOW())
            ON CONFLICT ("sourceTimestamp", "viewType") DO UPDATE SET
                "displayName"    = EXCLUDED."displayName",
                "registryDid"    = EXCLUDED."registryDid",
                "relatedTopicId" = EXCLUDED."relatedTopicId",
                "businessData"   = EXCLUDED."businessData",
                "searchText"     = EXCLUDED."searchText",
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()
            `,
            [
                proj.sourceTimestamp,
                proj.name,
                proj.registryDid,
                proj.topicId,
                JSON.stringify(businessData),
                searchText,
            ],
        );

        validTimestamps.push(proj.sourceTimestamp);
    }

    if (validTimestamps.length > 0) {
        const placeholders = validTimestamps.map((_, i) => `$${i + 1}`).join(', ');
        await dataSource.query(
            `DELETE FROM business_view WHERE "viewType" = 'PROJECT' AND "sourceTimestamp" NOT IN (${placeholders})`,
            validTimestamps,
        );
    } else {
        await dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
    }
}
