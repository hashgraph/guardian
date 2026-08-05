import { FieldDef } from './types';

// ---------------------------------------------------------------------------
// Re-export helpers used by project-mapper.service
// ---------------------------------------------------------------------------
export { buildSchemaEntryImproved } from './schema-classifier';

// ---------------------------------------------------------------------------
// SDG extraction from free text
// ---------------------------------------------------------------------------

/**
 * Extracts SDG numbers (1-17) from free-text co-benefits descriptions.
 * Handles two common Guardian patterns:
 *   1. Explicit "SDG N" references  → "contributions to SDG 1, SDG 13 …"
 *   2. Numbered list items          → "1 - Poverty reduction … 5 - Gender …"
 */
export function extractSdgsFromText(text: string): number[] {
    if (!text) return [];
    const sdgs = new Set<number>();

    for (const m of text.matchAll(/\bSDG[-\s]*(\d{1,2})\b/gi)) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 17) sdgs.add(n);
    }

    for (const m of text.matchAll(/(?<!\d)(\d{1,2})\s*[-–]\s+(?=[A-Z\d])/g)) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 17) sdgs.add(n);
    }

    return [...sdgs].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

/**
 * Shape D fallback: recursively find latitude/longitude string fields (ISO14064 pattern).
 * Handles: {"coordinates": {"latitude": "1.37", "longitude": "32.29"}}
 */
export function extractLatLngStrings(obj: Record<string, any>, depth = 0): [number, number] | null {
    if (!obj || typeof obj !== 'object' || depth > 3) return null;
    const latV = obj['latitude'] ?? obj['Latitude'];
    const lngV = obj['longitude'] ?? obj['Longitude'];
    if (latV != null && lngV != null) {
        const lat = parseFloat(String(latV));
        const lng = parseFloat(String(lngV));
        if (!isNaN(lat) && !isNaN(lng)) return [lng, lat];
    }
    for (const v of Object.values(obj)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            const r = extractLatLngStrings(v as Record<string, any>, depth + 1);
            if (r) return r;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Field lookup helpers (used by ProjectMapperService when projectFieldMap
// doesn't pre-resolve a key — e.g. for Shape-C sibling schemas).
// ---------------------------------------------------------------------------

function fieldSearchable(fd: FieldDef): string {
    return `${fd.title} ${fd.description}`.toLowerCase();
}

function unwrapValue(val: unknown): string {
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) {
        for (const item of val) {
            const s = unwrapValue(item);
            if (s) return s;
        }
        return '';
    }
    if (val && typeof val === 'object') {
        for (const v of Object.values(val as Record<string, unknown>)) {
            if (typeof v === 'string') {
                const s = v.trim();
                if (s && s.toLowerCase() !== 'not specified') return s;
            }
        }
        return '';
    }
    return String(val ?? '').trim();
}

export function findFieldByTitleOrDesc(
    subject: Record<string, any>,
    fieldMap: Record<string, FieldDef>,
    ...keywords: string[]
): string {
    for (const [fk, fd] of Object.entries(fieldMap)) {
        if (fd.isGeoJson) continue;
        const searchable = fieldSearchable(fd);
        if (keywords.some(kw => searchable.includes(kw.toLowerCase()))) {
            const val = subject[fk];
            if (val != null) {
                const s = unwrapValue(val);
                if (s) return s;
            }
        }
    }
    return '';
}

export function findFieldByTitleOrDescExcluding(
    subject: Record<string, any>,
    fieldMap: Record<string, FieldDef>,
    keywords: string[],
    exclude: string[],
): string {
    for (const [fk, fd] of Object.entries(fieldMap)) {
        if (fd.isGeoJson) continue;
        const searchable = fieldSearchable(fd);
        if (keywords.some(kw => searchable.includes(kw.toLowerCase())) &&
            !exclude.some(ex => searchable.includes(ex.toLowerCase()))) {
            const val = subject[fk];
            if (val != null) {
                const s = unwrapValue(val);
                if (s) return s;
            }
        }
    }
    return '';
}
