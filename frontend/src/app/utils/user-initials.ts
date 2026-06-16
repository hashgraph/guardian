/**
 * Two-letter avatar initials: prefer the first two capital letters, otherwise the
 * first two characters uppercased. Shared by the header avatar and the profile page.
 */
export function getUserInitials(username: string | null | undefined): string {
    if (!username) {
        return '?';
    }
    const caps = username.match(/[A-Z]/g);
    if (caps && caps.length >= 2) {
        return caps.slice(0, 2).join('');
    }
    return username.slice(0, 2).toUpperCase();
}
