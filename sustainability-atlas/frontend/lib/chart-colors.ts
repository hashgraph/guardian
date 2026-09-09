/**
 * 15 evenly spaced hues plus neutral for aggregated "Other".
 * Colors are assigned with equal spacing on the donut (largest slice first):
 * slice i → palette slot floor(i × 15 ÷ n), then a seeded rotation so
 * first/last neighbors on the ring are always far apart in hue (fixes
 * two-greens when n is small).
 */
export const DONUT_OTHER_COLOR = 'hsl(218, 14%, 48%)';

/** ~24° hue steps, higher saturation for on-screen vibrancy. */
const DONUT_PALETTE = [
    'hsl(352, 88%, 52%)',
    'hsl(16, 92%, 53%)',
    'hsl(38, 94%, 52%)',
    'hsl(58, 91%, 46%)',
    'hsl(82, 84%, 42%)',
    'hsl(122, 76%, 42%)',
    'hsl(152, 82%, 38%)',
    'hsl(178, 82%, 42%)',
    'hsl(202, 92%, 48%)',
    'hsl(222, 88%, 54%)',
    'hsl(252, 82%, 56%)',
    'hsl(278, 76%, 54%)',
    'hsl(304, 82%, 52%)',
    'hsl(322, 82%, 52%)',
    'hsl(335, 82%, 53%)',
] as const;

export const DONUT_TOP_N = 15;

export function stableHash(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/**
 * One color per wedge in display order; hues are as evenly spaced around
 * the circle as the fixed 15-slot palette allows (wraps first↔last cleanly).
 */
export function allocateDonutColors(sliceCount: number, seed: string): string[] {
    if (sliceCount <= 0) return [];
    const n = sliceCount;
    const m = DONUT_PALETTE.length;
    const offset = stableHash(seed) % m;
    const colors: string[] = [];
    for (let i = 0; i < n; i++) {
        const slot = Math.floor((i * m) / n);
        const idx = (slot + offset) % m;
        colors.push(DONUT_PALETTE[idx]!);
    }
    return colors;
}

export type DonutMergeBin = {
    label: string;
    projectCount: number;
    creditCount: number;
};

/** Sort by selected metric descending, keep top DONUT_TOP_N, roll the rest into one row. */
export function mergeTopBinsWithOther(
    bins: DonutMergeBin[],
    mode: 'projects' | 'credits',
    otherLabel: string,
): DonutMergeBin[] {
    if (bins.length === 0) return [];
    const val = (b: DonutMergeBin) =>
        mode === 'projects' ? b.projectCount : b.creditCount;

    const sorted = [...bins].sort((a, b) => val(b) - val(a));

    if (sorted.length <= DONUT_TOP_N) return sorted;

    const top = sorted.slice(0, DONUT_TOP_N);
    const tail = sorted.slice(DONUT_TOP_N);
    const other: DonutMergeBin = {
        label: otherLabel,
        projectCount: tail.reduce((s, b) => s + b.projectCount, 0),
        creditCount: tail.reduce((s, b) => s + b.creditCount, 0),
    };
    return [...top, other];
}
