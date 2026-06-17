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
