export type DashboardType = 'watchlist' | 'widgets' | 'custom_charts' | 'watchlist_filters';

export type WatchlistItemType = 'project';

export interface WatchlistItem {
    id: string;
    type: WatchlistItemType;
    name: string;
    meta?: string;
}

export interface CustomChartPayload {
    title: string;
    type: 'line' | 'bar' | 'donut';
    xAxis: string;
    yAxis: string;
}

// Multi-select watchlist filters (country/methodology/registry), pipe-joined
// per key — same shape the frontend's FilterBar.vue already uses for
// activeFilters, e.g. { country: 'Brazil|Kenya', registry: '<did>' }.
export type WatchlistFilters = Record<string, string>;

export interface DashboardPreferences {
    watchlist: WatchlistItem[];
    widgets: Record<string, boolean>;
    customCharts: CustomChartPayload[];
    watchlistFilters: WatchlistFilters;
}
