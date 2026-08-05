/**
 * Reads the non-httpOnly `csrf` cookie and returns it as a header object for
 * cookie-authenticated mutating requests (double-submit CSRF). Empty on the
 * server. Spread into a $fetch `headers` option alongside credentials:'include'.
 */
export const useCsrf = () => {
    const header = (): Record<string, string> => {
        if (import.meta.server) return {};
        const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return m ? { 'x-csrf-token': decodeURIComponent(m[1]) } : {};
    };
    return { header };
};
