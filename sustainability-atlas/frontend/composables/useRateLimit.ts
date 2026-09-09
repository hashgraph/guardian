/**
 * Rate-limit request composable — user submit/view + admin review.
 *
 * Reads forward the session cookie (SSR) / use credentials (client); mutations
 * send the X-CSRF-Token double-submit header.
 */

export type RateLimitStatus = 'pending' | 'approved' | 'adjusted' | 'declined';

export interface RateLimitRequest {
    id: string;
    requestedQuota: number;
    justification: string;
    status: RateLimitStatus;
    approvedQuota: number | null;
    resolvedNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

export interface MyRateLimitSummary {
    data: RateLimitRequest[];
    currentQuota: number;
    roleDefault: number;
    maxQuota: number;
    hasPending: boolean;
    /** When false, rate limiting isn't enforced — quota/request controls are
     *  cosmetic and the UI disables them (faded + not clickable + hover tooltip). */
    rateLimitEnforced: boolean;
    /** When false, data access is public — API keys aren't required and the UI
     *  disables the API-keys controls. */
    dataAccessEnforced: boolean;
}

export interface AdminRateLimitRequest {
    id: string;
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    userRole: 'system_user' | 'admin';
    currentQuota: number | null;
    requestedQuota: number;
    justification: string;
    status: RateLimitStatus;
    approvedQuota: number | null;
    resolvedNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

export interface ResolveBody {
    decision: 'approved' | 'adjusted' | 'declined';
    approvedQuota?: number;
    note?: string;
}

export const useRateLimit = () => {
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

    async function getMine(): Promise<MyRateLimitSummary> {
        return apiFetch<MyRateLimitSummary>('/api/v1/me/rate-limit-requests', {
            baseURL: baseURL(),
            credentials: 'include',
            headers: ssrCookieHeader(),
        });
    }

    async function submit(requestedQuota: number, justification: string): Promise<MyRateLimitSummary> {
        return apiFetch<MyRateLimitSummary>('/api/v1/me/rate-limit-requests', {
            method: 'POST',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body: { requestedQuota, justification },
        });
    }

    async function adminList(status?: RateLimitStatus): Promise<AdminRateLimitRequest[]> {
        return apiFetch<AdminRateLimitRequest[]>('/api/v1/admin/rate-limit-requests', {
            baseURL: baseURL(),
            credentials: 'include',
            headers: ssrCookieHeader(),
            query: status ? { status } : {},
        });
    }

    async function adminResolve(id: string, body: ResolveBody): Promise<AdminRateLimitRequest> {
        return apiFetch<AdminRateLimitRequest>(`/api/v1/admin/rate-limit-requests/${id}`, {
            method: 'PATCH',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body,
        });
    }

    return { getMine, submit, adminList, adminResolve };
};
