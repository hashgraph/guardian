import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Priority sort:
//   1st — Special characters / spaces
//   2nd — Numbers (0–9), compared naturally (e.g. "2" < "10")
//   3rd — Letters (A–Z / a–z, case-insensitive, treated as one group)
// Within each group, localeCompare with numeric:true gives natural ordering.
function charGroup(s: string): number {
    const c = s[0];
    if (!c) return 0;
    if (/\d/.test(c)) return 1;
    if (/[a-zA-Z]/.test(c)) return 2;
    return 0; // special characters / spaces
}

export function naturalCompare(a: string, b: string): number {
    const ga = charGroup(a);
    const gb = charGroup(b);
    if (ga !== gb) return ga - gb;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

const INVALID_COUNTRY_LOWER = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);

// Returns false for raw lat/lng coordinates, IPFS/file URIs, and other
// non-place-name strings that sometimes end up in a project's country field.
export function isValidCountryName(v: string): boolean {
    if (!v) return false;
    if (INVALID_COUNTRY_LOWER.has(v.toLowerCase())) return false;
    if (/:\/\//.test(v)) return false;
    if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{20,})$/i.test(v)) return false;
    // raw coordinate: "32.5825" or "90.3563° E" or "-23.1"
    if (/^-?\d+(\.\d+)?\s*°?\s*[NSEW]?$/i.test(v.trim())) return false;
    return true;
}

// Multi-select filter values are joined with `|` into a single query-string
// value. Percent-encoding each value before the join (and decoding each part
// after the split) keeps the join/split collision-proof even when a value
// itself contains a literal `|` (e.g. testnet methodology names like
// "MECD-v2.0 | LKA | V1.0"). Without this, such a value would be split into
// spurious extra parts, breaking both "is this selected" checks and count
// badges.
export function encodeMultiValue(values: string[]): string {
    return values.map(v => encodeURIComponent(v)).join('|');
}

// The try/catch fallback keeps this backward-compatible with old, never-encoded
// raw values already in bookmarked URLs / previously-saved searches (decoding
// a plain string with no `%` sequences is a safe no-op).
export function decodeMultiValue(raw?: string | null): string[] {
    if (!raw || raw === 'all') return [];
    return raw.split('|').map(part => {
        try { return decodeURIComponent(part); } catch { return part; }
    }).filter(Boolean);
}
