/**
 * Authentication composable — mirrors the useNetwork() useState pattern.
 *
 * Holds the current user in SSR-shared state and exposes the imperative auth
 * actions (login / signup / logout / fetchMe) plus the sign-in/up modal state.
 *
 * Cookie model (resolved decision): same-domain reverse-proxy topology with
 * httpOnly access + refresh cookies and a non-httpOnly `csrf` cookie.
 *  - Client calls use credentials:'include' so the browser sends the cookies.
 *  - SSR calls forward the incoming request's Cookie header to the API.
 *  - Mutating cookie-authenticated calls (logout) send the X-CSRF-Token header
 *    read from the non-httpOnly csrf cookie (double-submit defense).
 */

export interface AuthUser {
    id: string;
    email: string;
    role: 'system_user' | 'admin';
    firstName: string | null;
    lastName: string | null;
    organisation: string | null;
    jobTitle: string | null;
    country: string | null;
    emailVerifiedAt: string | null;
    mustChangePassword: boolean;
    createdAt: string;
}

export interface SignUpPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country: string;
    organisation?: string;
    jobTitle?: string;
}

export interface ActivityItem {
    id: string;
    action: string;
    outcome: string;
    ip: string | null;
    createdAt: string;
}

export interface MyActivityResult {
    items: ActivityItem[];
    total: number;
    page: number;
    pageSize: number;
    actions: string[];
}

export type AuthModalView = 'signin' | 'signup' | null;

/**
 * Password-complexity policy — mirrors the API's PasswordPolicy shape. Fetched
 * from GET /auth/password-policy (driven by the API's PASSWORD_SECURITY_LEVEL) so
 * the live UI rules always match what the server enforces.
 */
export interface PasswordPolicy {
    level: 'low' | 'medium' | 'high';
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
}

/** Safe fallback until the policy is fetched (matches the API's `medium` default). */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    level: 'medium',
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
};

export interface PasswordRule {
    key: string;
    /** i18n key for the human-readable rule label. */
    labelKey: string;
    /** Interpolation params for the label (e.g. the minimum length). */
    labelParams?: Record<string, unknown>;
    ok: boolean;
}

/**
 * Builds the live password rules for a given policy — shared by the sign-up,
 * reset-password and change-password flows so they all validate identically and
 * exactly match the server. Only the rules the policy requires are returned.
 */
export function passwordRules(pw: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): PasswordRule[] {
    const rules: PasswordRule[] = [
        { key: 'length', labelKey: 'auth.pwRuleLength', labelParams: { n: policy.minLength }, ok: pw.length >= policy.minLength },
    ];
    if (policy.requireUppercase) rules.push({ key: 'upper', labelKey: 'auth.pwRuleUpper', ok: /[A-Z]/.test(pw) });
    if (policy.requireLowercase) rules.push({ key: 'lower', labelKey: 'auth.pwRuleLower', ok: /[a-z]/.test(pw) });
    if (policy.requireNumber) rules.push({ key: 'number', labelKey: 'auth.pwRuleNumber', ok: /[0-9]/.test(pw) });
    if (policy.requireSpecial) rules.push({ key: 'special', labelKey: 'auth.pwRuleSpecial', ok: /[^A-Za-z0-9]/.test(pw) });
    return rules;
}

/** True when a password satisfies every rule in the given policy. */
export function isPasswordValid(pw: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): boolean {
    return passwordRules(pw, policy).every((r) => r.ok);
}

/** Email format check: verifies an @ and a TLD (dot + 2+ letters). Shared FE gate. */
export function isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export const useAuth = () => {
    const user = useState<AuthUser | null>('auth-user', () => null);
    const modal = useState<AuthModalView>('auth-modal', () => null);
    // Shared, SSR-safe cache of the server's password policy (fetched once).
    const passwordPolicy = useState<PasswordPolicy>('auth-password-policy', () => DEFAULT_PASSWORD_POLICY);
    const passwordPolicyLoaded = useState<boolean>('auth-password-policy-loaded', () => false);
    const config = useRuntimeConfig();
    const { apiFetch } = useApiFetch();

    const isAuthenticated = computed(() => !!user.value);
    const isAdmin = computed(() => user.value?.role === 'admin');
    const isSystemUser = computed(() => user.value?.role === 'system_user');

    // Server uses the full API URL; client uses the relative path (proxied by Nuxt).
    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    /** On SSR, forward the browser's cookies to the API so it can read the session. */
    const ssrCookieHeader = (): Record<string, string> => {
        if (!import.meta.server) return {};
        const cookie = useRequestHeaders(['cookie']).cookie;
        return cookie ? { cookie } : {};
    };

    /** Reads the non-httpOnly csrf cookie value (client only) for the double-submit header. */
    const readCsrfCookie = (): string => {
        if (import.meta.server) return '';
        const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    /**
     * Loads the active password policy from the API once and caches it. Best-effort:
     * on any error the DEFAULT_PASSWORD_POLICY fallback stays in place so the UI works.
     */
    async function fetchPasswordPolicy(force = false): Promise<PasswordPolicy> {
        if (passwordPolicyLoaded.value && !force) return passwordPolicy.value;
        try {
            const policy = await apiFetch<PasswordPolicy>('/api/v1/auth/password-policy', {
                baseURL: baseURL(),
                headers: ssrCookieHeader(),
            });
            if (policy && typeof policy.minLength === 'number') {
                passwordPolicy.value = policy;
                passwordPolicyLoaded.value = true;
            }
        } catch {
            // Keep the fallback policy; live rules still render sensibly.
        }
        return passwordPolicy.value;
    }

    /** Loads the current user from /auth/me (with silent refresh-on-401 retry). */
    async function fetchMe(): Promise<void> {
        try {
            user.value = await apiFetch<AuthUser>('/api/v1/auth/me', {
                baseURL: baseURL(),
                credentials: 'include',
                headers: ssrCookieHeader(),
            });
        } catch {
            user.value = null;
        }
    }

    /** Email + password sign-in. Sets cookies (server-side) and populates user state. */
    async function login(email: string, password: string): Promise<AuthUser> {
        const profile = await $fetch<AuthUser>('/api/v1/auth/login', {
            method: 'POST',
            baseURL: baseURL(),
            credentials: 'include',
            body: { email, password },
        });
        user.value = profile;
        modal.value = null;
        return profile;
    }

    /** Self-service registration. Returns the neutral confirmation message. */
    async function signup(payload: SignUpPayload): Promise<{ message: string }> {
        return $fetch<{ message: string }>('/api/v1/auth/signup', {
            method: 'POST',
            baseURL: baseURL(),
            credentials: 'include',
            body: payload,
        });
    }

    /** Revokes the session, clears cookies (server-side) and local state. */
    async function logout(): Promise<void> {
        try {
            await $fetch('/api/v1/auth/logout', {
                method: 'POST',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
            });
        } catch {
            // Ignore — we clear local state regardless so the UI reflects sign-out.
        } finally {
            user.value = null;
        }
    }

    /** Consumes an email-verification token (from the emailed link). */
    async function verifyEmail(token: string): Promise<{ message: string }> {
        return $fetch<{ message: string }>('/api/v1/auth/verify-email', {
            method: 'POST',
            baseURL: baseURL(),
            body: { token },
        });
    }

    /** Requests a password-reset email. Always resolves neutrally (no enumeration). */
    async function forgotPassword(email: string): Promise<{ message: string }> {
        return $fetch<{ message: string }>('/api/v1/auth/forgot-password', {
            method: 'POST',
            baseURL: baseURL(),
            body: { email },
        });
    }

    /** Sets a new password using a reset token (from the emailed link). */
    async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        return $fetch<{ message: string }>('/api/v1/auth/reset-password', {
            method: 'POST',
            baseURL: baseURL(),
            body: { token, newPassword },
        });
    }

    /** Re-sends the email-verification link for the signed-in user (throttled server-side). */
    async function resendVerification(): Promise<{ sent: boolean; message: string; retryAfterSeconds?: number }> {
        return apiFetch<{ sent: boolean; message: string; retryAfterSeconds?: number }>(
            '/api/v1/auth/resend-verification',
            {
                method: 'POST',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
            },
        );
    }

    /** Updates the signed-in user's own editable profile fields; refreshes state. */
    async function updateProfile(
        payload: Partial<Pick<AuthUser, 'firstName' | 'lastName' | 'organisation' | 'jobTitle' | 'country'>>,
    ): Promise<void> {
        const profile = await apiFetch<AuthUser>('/api/v1/auth/me', {
            method: 'PATCH',
            baseURL: baseURL(),
            credentials: 'include',
            headers: { 'x-csrf-token': readCsrfCookie() },
            body: payload,
        });
        user.value = profile;
    }

    /** Loads the signed-in user's own recent activity (paginated, optional action filter). */
    async function fetchActivity(
        params: { page?: number; pageSize?: number; action?: string } = {},
    ): Promise<MyActivityResult> {
        const query: Record<string, string | number> = {};
        if (params.page) query.page = params.page;
        if (params.pageSize) query.pageSize = params.pageSize;
        if (params.action) query.action = params.action;
        return apiFetch<MyActivityResult>('/api/v1/auth/me/activity', {
            baseURL: baseURL(),
            credentials: 'include',
            headers: ssrCookieHeader(),
            query,
        });
    }

    /** Changes the signed-in user's password; updates state (clears mustChangePassword). */
    async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const profile = await apiFetch<AuthUser>('/api/v1/auth/change-password', {
            method: 'POST',
            baseURL: baseURL(),
            credentials: 'include',
            headers: { 'x-csrf-token': readCsrfCookie() },
            body: { currentPassword, newPassword },
        });
        user.value = profile;
    }

    const openSignIn = (): void => { modal.value = 'signin'; };
    const openSignUp = (): void => { modal.value = 'signup'; };
    const closeModal = (): void => { modal.value = null; };

    return {
        user,
        isAuthenticated,
        isAdmin,
        isSystemUser,
        modal,
        fetchMe,
        login,
        signup,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
        resendVerification,
        updateProfile,
        fetchActivity,
        changePassword,
        openSignIn,
        openSignUp,
        closeModal,
        passwordPolicy,
        fetchPasswordPolicy,
    };
};
