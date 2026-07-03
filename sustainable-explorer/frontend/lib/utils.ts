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
