/**
 * Saved Search composable — one independent list per page section.
 *
 * Mirrors usePortfolioSync.ts's baseURL()/CSRF-cookie pattern exactly (same
 * server/client baseURL split, same non-httpOnly `csrf` cookie read for the
 * double-submit header on mutating calls).
 *
 * Parameterized by `section` (not a useState singleton) since Projects and
 * Issuances each need their own independent saved-search list.
 */
export interface SavedSearchCriteria {
    search?: string;
    filters: Record<string, string>;
    sort?: { key: string; dir: 'asc' | 'desc' };
}

export interface SavedSearch {
    id: string;
    name: string;
    criteria: SavedSearchCriteria;
    createdAt: string;
}

export function useSavedSearches(section: 'projects' | 'methodologies' | 'issuances') {
    const { isAuthenticated } = useAuth();
    const { apiFetch } = useApiFetch();
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const { t } = useI18n();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    // readCsrfCookie() in useAuth.ts is a local closure (not exported).
    // Re-implemented here with the same regex, same as usePortfolioSync.ts.
    const readCsrfCookie = (): string => {
        if (!import.meta.client) return '';
        const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const savedSearches = ref<SavedSearch[]>([]);
    const loading = ref(false);

    async function fetchAll(): Promise<void> {
        if (!isAuthenticated.value || !import.meta.client) return;
        loading.value = true;
        try {
            savedSearches.value = await apiFetch<SavedSearch[]>('/api/v1/me/quick-filters', {
                baseURL: baseURL(),
                credentials: 'include',
                query: { network: network.value, section },
            });
        } catch {
            savedSearches.value = [];
        } finally {
            loading.value = false;
        }
    }

    /** Returns the created row, or an error message string on failure (e.g. duplicate name). */
    async function save(name: string, criteria: SavedSearchCriteria): Promise<SavedSearch | string> {
        try {
            const created = await apiFetch<SavedSearch>('/api/v1/me/quick-filters', {
                method: 'POST',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
                body: { network: network.value, section, name, criteria },
            });
            savedSearches.value = [...savedSearches.value, created];
            return created;
        } catch (err: unknown) {
            const e = err as { response?: { status?: number; _data?: { message?: string } } };
            if (e.response?.status === 409) return e.response._data?.message ?? t('savedSearch.duplicateName');
            return t('savedSearch.saveError');
        }
    }

    async function remove(id: string): Promise<void> {
        const prior = savedSearches.value;
        savedSearches.value = prior.filter(s => s.id !== id); // optimistic
        try {
            await apiFetch(`/api/v1/me/quick-filters/${id}`, {
                method: 'DELETE',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
            });
        } catch {
            savedSearches.value = prior; // rollback on failure
        }
    }

    return { savedSearches, loading, fetchAll, save, remove };
}
