import { Injectable } from '@nestjs/common';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgDashboardRepository, DashboardMintQuery } from '../repositories/pg-dashboard.repository';
import { DashboardMintStatsDto } from '../dto/dashboard.dto';

interface CacheEntry {
    data: DashboardMintStatsDto;
    expiresAt: number;
}

@Injectable()
export class DashboardService {
    // In-memory cache keyed by "network:registry:developer".
    // TTL matches MV_REFRESH_INTERVAL so the data is never staler than the
    // underlying business_view materialized view.
    private readonly cache = new Map<string, CacheEntry>();
    private readonly CACHE_TTL_MS = 60_000;

    constructor(private readonly dataSources: NetworkDataSourceRegistry) {}

    async getMintStats(network: string, query: DashboardMintQuery): Promise<DashboardMintStatsDto> {
        const cacheKey = `${network}:${query.registry ?? ''}:${query.developer ?? ''}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const repo = new PgDashboardRepository(this.dataSources.getDataSource(network));
        const rows = await repo.getMintAggregations(query);

        const result = this.aggregate(rows);
        this.setCache(cacheKey, result);
        return result;
    }

    private aggregate(rows: Awaited<ReturnType<PgDashboardRepository['getMintAggregations']>>): DashboardMintStatsDto {
        let totalMinted = 0;
        const monthMap = new Map<string, number>();
        const sectorMap = new Map<string, number>();
        const registryMap = new Map<string, number>();

        for (const row of rows) {
            const amount = Number(row.amount) || 0;
            totalMinted += amount;

            // Monthly series — key is ISO month string 'YYYY-MM-01'
            if (row.month) {
                const monthKey = row.month instanceof Date
                    ? row.month.toISOString().slice(0, 7) + '-01'
                    : String(row.month).slice(0, 7) + '-01';
                monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + amount);
            }

            // Sector breakdown
            const sector = row.sector || '';
            sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + amount);

            // Registry breakdown
            const registry = row.registry || 'Unknown';
            registryMap.set(registry, (registryMap.get(registry) ?? 0) + amount);
        }

        return {
            totalMinted,
            mintSeries: [...monthMap.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, amount]) => ({ month, amount })),
            bySector: [...sectorMap.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([label, amount]) => ({ label, amount })),
            byRegistry: [...registryMap.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([label, amount]) => ({ label, amount })),
        };
    }

    private getFromCache(key: string): DashboardMintStatsDto | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    private setCache(key: string, data: DashboardMintStatsDto): void {
        this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
    }
}
