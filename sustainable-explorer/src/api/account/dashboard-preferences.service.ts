import { Injectable, BadRequestException } from '@nestjs/common';
import { DashboardPreferencesRepository } from './dashboard-preferences.repository';
import { RedisService } from '@shared/redis/redis.service';
import type {
    DashboardType,
    DashboardPreferences,
    WatchlistItem,
    CustomChartPayload,
    WatchlistFilters,
} from './dto/dashboard-layout.types';

const DASHBOARD_CACHE_TTL_SECONDS = 3600;

const DEFAULTS: DashboardPreferences = {
    watchlist: [],
    widgets: {},
    customCharts: [],
    watchlistFilters: {},
};

@Injectable()
export class DashboardPreferencesService {
    constructor(
        private readonly repo: DashboardPreferencesRepository,
        private readonly redis: RedisService,
    ) {}

    private cacheKey(userId: string, network: string): string {
        return `dashboard:${userId}:${network}`;
    }

    async get(userId: string, network: string): Promise<DashboardPreferences> {
        const key = this.cacheKey(userId, network);
        const cached = await this.redis.getJson<DashboardPreferences>(key);
        if (cached) return cached;

        const fresh = await this.buildFromDb(userId, network);
        await this.redis.setJson(key, fresh, DASHBOARD_CACHE_TTL_SECONDS);
        return fresh;
    }

    async saveType(
        userId: string,
        network: string,
        type: DashboardType,
        layout: unknown,
    ): Promise<{ name: string; updatedAt: Date }> {
        const normalized = this.normalize(type, layout);
        const row = await this.repo.upsertType(userId, network, type, normalized);
        await this.redis.del(this.cacheKey(userId, network));

        // Keep the watchlist_subscriptions reverse index (NotificationScanService's
        // "who watches project X" lookup) in lockstep with every watchlist save.
        // Pure system-DB bookkeeping — no cross-DB dependency added to this path.
        if (type === 'watchlist') {
            const refs = (normalized as WatchlistItem[])
                .map((i) => i.id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);
            await this.repo.syncWatchlistSubscriptions(userId, network, refs);
        }

        return { name: row.name, updatedAt: row.updatedAt };
    }

    private async buildFromDb(userId: string, network: string): Promise<DashboardPreferences> {
        const rows = await this.repo.findAllByUserAndNetwork(userId, network);

        // First visit for this user+network — lazy-seed default rows so all
        // future PUTs are clean UPDATEs rather than upserts against missing rows.
        // Avoids coupling user creation (auth module) to dashboard defaults.
        if (rows.length === 0) {
            await this.repo.seedDefaults(userId, network);
            return { ...DEFAULTS };
        }

        const result: DashboardPreferences = { ...DEFAULTS };
        for (const row of rows) {
            if (row.name === 'watchlist')         result.watchlist        = (row.layout as WatchlistItem[]) ?? [];
            if (row.name === 'widgets')           result.widgets          = (row.layout as Record<string, boolean>) ?? {};
            if (row.name === 'custom_charts')     result.customCharts     = (row.layout as CustomChartPayload[]) ?? [];
            if (row.name === 'watchlist_filters') result.watchlistFilters = (row.layout as WatchlistFilters) ?? {};
        }
        return result;
    }

    private normalize(type: DashboardType, layout: unknown): unknown {
        if (type === 'watchlist')
            // Defensive: only 'project' items are writable going forward — drops
            // any stale methodology/registry/token entries from older clients.
            return Array.isArray(layout)
                ? layout.filter(
                    (i): i is WatchlistItem =>
                        !!i && typeof i === 'object' && (i as WatchlistItem).type === 'project',
                )
                : [];
        if (type === 'widgets')
            return (layout && typeof layout === 'object' && !Array.isArray(layout)) ? layout : {};
        if (type === 'custom_charts')
            return Array.isArray(layout) ? (layout as unknown[]).slice(0, 5) : [];
        if (type === 'watchlist_filters')
            return (layout && typeof layout === 'object' && !Array.isArray(layout))
                ? Object.fromEntries(
                    Object.entries(layout as Record<string, unknown>).filter(
                        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
                    ),
                )
                : {};
        throw new BadRequestException(`Unknown dashboard type: ${type}`);
    }
}
