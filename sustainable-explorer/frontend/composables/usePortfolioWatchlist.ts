export type WatchlistItemType = 'project';

export interface WatchlistItem {
    id: string;
    type: WatchlistItemType;
    name: string;
    meta?: string;
}

// Portfolio is a logged-in-only feature (see the `auth` route middleware on
// `pages/portfolio/index.vue`) — state lives server-side via usePortfolioSync;
// no localStorage layer, so there's no guest-local/server reconciliation to do.
export function usePortfolioWatchlist() {
    const watchlistItems = useState<WatchlistItem[]>('portfolio-watchlist', () => []);

    function hasItem(id: string, type: WatchlistItemType): boolean {
        return watchlistItems.value.some(i => i.id === id && i.type === type);
    }

    function addItem(item: WatchlistItem): void {
        if (hasItem(item.id, item.type)) return;
        watchlistItems.value = [...watchlistItems.value, item];
    }

    function removeItem(id: string, type: WatchlistItemType): void {
        watchlistItems.value = watchlistItems.value.filter(i => !(i.id === id && i.type === type));
    }

    const count = computed(() => watchlistItems.value.length);

    return { watchlistItems, addItem, removeItem, hasItem, count };
}
