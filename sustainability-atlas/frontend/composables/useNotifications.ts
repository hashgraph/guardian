/**
 * Watchlist notifications composable — mirrors useSavedSearches.ts's
 * baseURL()/CSRF-cookie pattern exactly (same server/client baseURL split,
 * same non-httpOnly `csrf` cookie read for the double-submit header on
 * mutating calls) but backed by useState() singletons (like useAuth.ts /
 * useNetwork.ts) since there's exactly one notifications inbox per user,
 * not one per page section.
 *
 * `type` on a NotificationItem is currently always 'issuance' (retirement/
 * transfer are future backend work) — kept as a plain string so the UI
 * doesn't need updating when new types land server-side.
 */
export interface NotificationItem {
    id: string;
    network: string;
    type: string;
    projectKey: string;
    payload: Record<string, unknown>;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationListResult {
    items: NotificationItem[];
    nextCursor: string | null;
}

export function useNotifications() {
    const { isAuthenticated } = useAuth();
    const { apiFetch } = useApiFetch();
    const { network } = useNetwork();
    const config = useRuntimeConfig();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    // readCsrfCookie() in useAuth.ts is a local closure (not exported).
    // Re-implemented here with the same regex, same as useSavedSearches.ts.
    const readCsrfCookie = (): string => {
        if (!import.meta.client) return '';
        const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const items = useState<NotificationItem[]>('notifications-items', () => []);
    const unreadCount = useState<number>('notifications-unread-count', () => 0);
    const loading = useState<boolean>('notifications-loading', () => false);
    // Separate from `loading`: set only while fetching an additional (non-reset)
    // page, so the dropdown can show a small inline "Loading more…" affordance
    // at the bottom of the list instead of hiding/blanking the existing rows.
    const loadingMore = useState<boolean>('notifications-loading-more', () => false);
    const nextCursor = useState<string | null>('notifications-next-cursor', () => null);
    // 'unread' reuses the backend's existing unreadOnly param (list-notifications-query.dto.ts)
    // rather than filtering client-side, so pagination stays correct for either tab.
    const filter = useState<'all' | 'unread'>('notifications-filter', () => 'all');

    const hasUnread = computed(() => unreadCount.value > 0);

    async function fetchUnreadCount(): Promise<void> {
        if (!isAuthenticated.value || !import.meta.client) return;
        try {
            const result = await apiFetch<{ count: number }>('/api/v1/me/notifications/unread-count', {
                baseURL: baseURL(),
                credentials: 'include',
                query: { network: network.value },
            });
            unreadCount.value = result.count;
        } catch (err) {
            console.error('[notifications] fetchUnreadCount failed:', err);
            // Leave the count untouched on error — a stale count is preferable
            // to flashing it to 0.
        }
    }

    /** Returns false on failure so callers (e.g. "load more") can surface it. */
    async function fetchList({ reset = false }: { reset?: boolean } = {}): Promise<boolean> {
        if (!isAuthenticated.value || !import.meta.client) return true;
        // A "load more" call (reset=false) with no further pages is a no-op —
        // avoids a redundant request if a stale click slips through after the
        // button/observer should already be hidden.
        if (!reset && !nextCursor.value) return true;

        if (reset) loading.value = true;
        else loadingMore.value = true;

        try {
            const result = await apiFetch<NotificationListResult>('/api/v1/me/notifications', {
                baseURL: baseURL(),
                credentials: 'include',
                query: {
                    network: network.value,
                    ...(filter.value === 'unread' ? { unreadOnly: true } : {}),
                    ...(reset ? {} : (nextCursor.value ? { cursor: nextCursor.value } : {})),
                },
            });
            items.value = reset ? result.items : [...items.value, ...result.items];
            nextCursor.value = result.nextCursor;
            return true;
        } catch (err) {
            console.error('[notifications] fetchList failed:', err);
            if (reset) items.value = [];
            return false;
        } finally {
            if (reset) loading.value = false;
            else loadingMore.value = false;
        }
    }

    function setFilter(next: 'all' | 'unread'): void {
        if (filter.value === next) return;
        filter.value = next;
        void fetchList({ reset: true });
    }

    /** Optimistic: flips the item read locally first, reverts both on failure. */
    async function markRead(id: string): Promise<void> {
        const target = items.value.find((i) => i.id === id);
        if (!target || target.isRead) return;

        target.isRead = true;
        const priorCount = unreadCount.value;
        unreadCount.value = Math.max(0, unreadCount.value - 1);

        try {
            await apiFetch(`/api/v1/me/notifications/${id}/read`, {
                method: 'PATCH',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
                query: { network: network.value },
            });
        } catch (err) {
            console.error('[notifications] markRead failed:', err);
            target.isRead = false; // rollback
            unreadCount.value = priorCount;
        }
    }

    /** Optimistic bulk mark-all-read; a failure resyncs from the server rather than trying to replay a partial rollback. */
    async function markAllRead(): Promise<boolean> {
        const priorItems = items.value.map((i) => ({ ...i }));
        const priorCount = unreadCount.value;

        items.value = items.value.map((i) => ({ ...i, isRead: true }));
        unreadCount.value = 0;

        try {
            await apiFetch('/api/v1/me/notifications/read-all', {
                method: 'POST',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
                query: { network: network.value },
            });
            return true;
        } catch (err) {
            console.error('[notifications] markAllRead failed:', err);
            items.value = priorItems;
            unreadCount.value = priorCount;
            await Promise.all([fetchList({ reset: true }), fetchUnreadCount()]);
            return false;
        }
    }

    /** Optimistic clear-all; a failure resyncs from the server. Returns success for the caller's toast. */
    async function clearAll(): Promise<boolean> {
        const priorItems = items.value;
        const priorCount = unreadCount.value;
        const priorCursor = nextCursor.value;

        items.value = [];
        unreadCount.value = 0;
        nextCursor.value = null;

        try {
            await apiFetch('/api/v1/me/notifications', {
                method: 'DELETE',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
                query: { network: network.value },
            });
            return true;
        } catch (err) {
            console.error('[notifications] clearAll failed:', err);
            items.value = priorItems;
            unreadCount.value = priorCount;
            nextCursor.value = priorCursor;
            await Promise.all([fetchList({ reset: true }), fetchUnreadCount()]);
            return false;
        }
    }

    return {
        items,
        unreadCount,
        loading,
        loadingMore,
        nextCursor,
        filter,
        hasUnread,
        fetchUnreadCount,
        fetchList,
        setFilter,
        markRead,
        markAllRead,
        clearAll,
    };
}
