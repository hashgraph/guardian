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

// ---------------------------------------------------------------------------
// TEMPORARY — UI-testing scaffolding only. `import.meta.dev` is a build-time
// constant (false, dead-code-eliminated) in production, so none of this ships.
// Remove this block once the bell has been visually verified against a real
// backend and isn't needed for local UI iteration anymore.
// ---------------------------------------------------------------------------
const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: 'mock-1', network: 'mainnet', type: 'issuance', projectKey: 'mock-amazon',
        payload: { projectName: 'Amazon Basin REDD+ Conservation Initiative', amount: 12500 },
        isRead: false, createdAt: new Date(Date.now() - 14 * 60_000).toISOString(),
    },
    {
        id: 'mock-2', network: 'mainnet', type: 'issuance', projectKey: 'mock-kariba',
        payload: { projectName: 'Kariba REDD+ Forest Protection Project — Zimbabwe Community Trust', amount: 4200 },
        isRead: false, createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
    {
        id: 'mock-3', network: 'mainnet', type: 'retirement', projectKey: 'mock-rimba',
        payload: { projectName: 'Rimba Raya Biodiversity Reserve', amount: 840 },
        isRead: false, createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    },
    {
        id: 'mock-4', network: 'mainnet', type: 'transfer', projectKey: 'mock-cordillera',
        payload: { projectName: 'Cordillera Azul National Park REDD+', amount: 1000 },
        isRead: true, createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    },
    {
        id: 'mock-5', network: 'mainnet', type: 'issuance', projectKey: 'mock-jari',
        payload: { projectName: 'Jari Pará REDD+ Project', amount: 900 },
        isRead: true, createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
        id: 'mock-6', network: 'mainnet', type: 'issuance', projectKey: 'mock-mai-ndombe',
        payload: { projectName: 'Mai Ndombe REDD+ Project', amount: 3150 },
        isRead: true, createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
];

export function useNotifications() {
    const { isAuthenticated: reallyAuthenticated } = useAuth();
    // TEMPORARY (UI-testing only, see MOCK_NOTIFICATIONS above): the guards
    // below must also treat dev mode as "authenticated," or they return
    // before ever reaching the network call whose `catch` block seeds the
    // mock fallback — otherwise the bell renders (via NotificationBell.vue's
    // own bypass) but stays empty forever. Revert to plain `reallyAuthenticated`
    // together with the rest of the mock scaffolding.
    const isAuthenticated = computed(() => reallyAuthenticated.value || import.meta.dev);
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
        } catch {
            // TEMPORARY (UI-testing only, dev-only, dead-code-eliminated in prod):
            // fall back to mock data so the bell is visually testable without a
            // running backend. Remove alongside the MOCK_NOTIFICATIONS block above.
            if (import.meta.dev) {
                unreadCount.value = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
                return;
            }
            // Leave the count untouched on error — a stale count is preferable
            // to flashing it to 0.
        }
    }

    async function fetchList({ reset = false }: { reset?: boolean } = {}): Promise<void> {
        if (!isAuthenticated.value || !import.meta.client) return;
        // A "load more" call (reset=false) with no further pages is a no-op —
        // avoids a redundant request if a stale click slips through after the
        // button/observer should already be hidden.
        if (!reset && !nextCursor.value) return;

        if (reset) loading.value = true;
        else loadingMore.value = true;

        try {
            const result = await apiFetch<NotificationListResult>('/api/v1/me/notifications', {
                baseURL: baseURL(),
                credentials: 'include',
                query: {
                    network: network.value,
                    ...(reset ? {} : (nextCursor.value ? { cursor: nextCursor.value } : {})),
                },
            });
            items.value = reset ? result.items : [...items.value, ...result.items];
            nextCursor.value = result.nextCursor;
        } catch {
            // TEMPORARY (UI-testing only, see MOCK_NOTIFICATIONS above).
            if (import.meta.dev && reset) {
                items.value = MOCK_NOTIFICATIONS;
                nextCursor.value = null;
            } else if (reset) {
                items.value = [];
            }
        } finally {
            if (reset) loading.value = false;
            else loadingMore.value = false;
        }
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
        } catch {
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
        } catch {
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
        } catch {
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
        hasUnread,
        fetchUnreadCount,
        fetchList,
        markRead,
        markAllRead,
        clearAll,
    };
}
