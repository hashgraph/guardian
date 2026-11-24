/** Colours that keep white text readable on a white background. */
export const AVATAR_PALETTE = [
    '#4169E2',
    '#19A06B',
    '#D9822B',
    '#8E44AD',
    '#E0457B',
    '#2A9BB5',
    '#6B7A99'
];

/** Up to two letters from the first words of the name; digits, `#` and `_` are skipped. */
export function getInitials(name: string): string {
    const words = (name || '')
        .replace(/[#\d_]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const initials = words
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
    return initials || '#';
}

/** A stable colour for the name. */
export function getAvatarColor(name: string): string {
    let hash = 0;
    for (const char of name || '') {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
