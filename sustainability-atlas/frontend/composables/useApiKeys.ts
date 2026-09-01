/**
 * API key management composable for the signed-in user.
 *
 * Reads forward the session cookie (SSR) / use credentials (client); mutations
 * also send the X-CSRF-Token double-submit header.
 */

export interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    status: 'active' | 'revoked';
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
}

export interface CreatedApiKey {
    id: string;
    name: string;
    prefix: string;
    key: string;
    createdAt: string;
}

export const useApiKeys = () => {
    const config = useRuntimeConfig();
    const { apiFetch } = useApiFetch();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    const ssrCookieHeader = (): Record<string, string> => {
        if (!import.meta.server) return {};
        const cookie = useRequestHeaders(['cookie']).cookie;
        return cookie ? { cookie } : {};
    };

    const csrfHeader = (): Record<string, string> => {
        if (import.meta.server) return {};
        const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return match ? { 'x-csrf-token': decodeURIComponent(match[1]) } : {};
    };

    async function list(): Promise<ApiKey[]> {
        return apiFetch<ApiKey[]>('/api/v1/me/api-keys', {
            baseURL: baseURL(),
            credentials: 'include',
            headers: ssrCookieHeader(),
        });
    }

    async function create(name: string): Promise<CreatedApiKey> {
        return apiFetch<CreatedApiKey>('/api/v1/me/api-keys', {
            method: 'POST',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body: { name },
        });
    }

    async function revoke(id: string): Promise<void> {
        await $fetch(`/api/v1/me/api-keys/${id}`, {
            method: 'DELETE',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
        });
    }

    return { list, create, revoke };
};
