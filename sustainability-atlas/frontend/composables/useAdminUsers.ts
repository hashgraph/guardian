/**
 * Admin user-management API composable.
 *
 * All calls hit the admin-only /api/v1/admin/users endpoints. Reads forward the
 * session cookie (SSR) / use credentials:'include' (client); mutations also send
 * the X-CSRF-Token header (double-submit) read from the non-httpOnly csrf cookie.
 */

export type AdminRole = 'system_user' | 'admin';

export interface AdminUser {
    id: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    firstName: string | null;
    lastName: string | null;
    organisation: string | null;
    jobTitle: string | null;
    country: string | null;
    emailVerifiedAt: string | null;
    mustChangePassword: boolean;
    apiQuotaPerHour: number | null;
    createdAt: string;
}

export interface AdminUserListResult {
    data: AdminUser[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    counts: { active: number; inactive: number; total: number };
}

export interface AdminCreateUserBody {
    email: string;
    password: string;
    role: AdminRole;
    firstName?: string;
    lastName?: string;
    organisation?: string;
    jobTitle?: string;
    country?: string;
}

export interface AdminUserListParams {
    search?: string;
    role?: AdminRole;
    status?: 'active' | 'inactive';
    verified?: 'verified' | 'unverified';
    page?: number;
    limit?: number;
}

export const useAdminUsers = () => {
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

    async function list(params: AdminUserListParams = {}): Promise<AdminUserListResult> {
        const query: Record<string, string | number> = {};
        if (params.search?.trim()) query.search = params.search.trim();
        if (params.role) query.role = params.role;
        if (params.status) query.status = params.status;
        if (params.verified) query.verified = params.verified;
        if (params.page) query.page = params.page;
        if (params.limit) query.limit = params.limit;
        return apiFetch<AdminUserListResult>('/api/v1/admin/users', {
            baseURL: baseURL(),
            credentials: 'include',
            headers: ssrCookieHeader(),
            query,
        });
    }

    async function create(body: AdminCreateUserBody): Promise<AdminUser> {
        return apiFetch<AdminUser>('/api/v1/admin/users', {
            method: 'POST',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body,
        });
    }

    async function setStatus(id: string, isActive: boolean): Promise<AdminUser> {
        return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/status`, {
            method: 'PATCH',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body: { isActive },
        });
    }

    async function setRole(id: string, role: AdminRole): Promise<AdminUser> {
        return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/role`, {
            method: 'PATCH',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body: { role },
        });
    }

    /** Sets / reduces a user's per-hour API quota. Justification is required (audited). */
    async function setQuota(id: string, quota: number, justification: string): Promise<AdminUser> {
        return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/quota`, {
            method: 'PATCH',
            baseURL: baseURL(),
            credentials: 'include',
            headers: csrfHeader(),
            body: { quota, justification },
        });
    }

    return { list, create, setStatus, setRole, setQuota };
};
