export type WatchlistItemType = 'project' | 'methodology' | 'registry' | 'token';

export interface WatchlistItem {
    id: string;
    type: WatchlistItemType;
    name: string;
    meta?: string;
}

const STORAGE_KEY = 'portfolio_watchlist';

export function usePortfolioWatchlist() {
    const watchlistItems = useState<WatchlistItem[]>('portfolio-watchlist', () => []);

    if (import.meta.client) {
        if (watchlistItems.value.length === 0) {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) watchlistItems.value = JSON.parse(raw) as WatchlistItem[];
            } catch {
                watchlistItems.value = [];
            }
        }
    }

    watch(watchlistItems, (items) => {
        if (import.meta.client) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            } catch {
                // ignore quota errors
            }
        }
    }, { deep: true });

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
