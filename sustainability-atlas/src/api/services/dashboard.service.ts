import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import {
    PgDashboardRepository,
    DashboardMintQuery,
    CountryAggRow,
    LabelAggRow,
    TotalsRow,
    FilterOptionsRow,
    CountryBreakdownRow,
    PortfolioMetricsRow,
    DeveloperAggRow,
    RegistryStatusRow,
    MapPointRow,
} from '../repositories/pg-dashboard.repository';
import {
    DashboardMintStatsDto,
    DashboardSummaryDto,
    LabelCountDto,
} from '../dto/dashboard.dto';

// Matches MV_REFRESH_INTERVAL, so a cached response is never staler than the
// materialized views its numbers are read from.
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class DashboardService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
    ) {}

    async getMintStats(network: string, query: DashboardMintQuery): Promise<DashboardMintStatsDto> {
        const cacheKey = this.cacheKey('mint-stats', network, query);
        const cached = await this.redis.getJson<DashboardMintStatsDto>(cacheKey);
        if (cached) return cached;

        const repo = new PgDashboardRepository(this.dataSources.getDataSource(network));
        const rows = await repo.getMintAggregations(query);

        const result = this.aggregate(rows);
        await this.redis.setJson(cacheKey, result, CACHE_TTL_SECONDS);
        return result;
    }

    /**
     * Every per-project aggregate the dashboard needs, in one response.
     * Postgres does the grouping, so the client receives one row per distinct
     * label rather than one per project. The aggregates are independent and
     * run concurrently.
     */
    async getSummary(network: string, query: DashboardMintQuery): Promise<DashboardSummaryDto> {
        const cacheKey = this.cacheKey('summary', network, query);
        const cached = await this.redis.getJson<DashboardSummaryDto>(cacheKey);
        if (cached) return cached;

        const repo = new PgDashboardRepository(this.dataSources.getDataSource(network));
        const [
            totals, filterOptions, countries, registries, sectors, vintages, mapPoints,
            countrySectors, countryRegistries, statuses, methodologies, portfolio,
            developers, registryStatuses, lifecycleStages,
        ] = await Promise.all([
            repo.getTotals(query),
            repo.getFilterOptions(),
            repo.getCountryAggregates(query),
            repo.getRegistryAggregates(query),
            repo.getSectorAggregates(query),
            repo.getVintageAggregates(query),
            repo.getMapPoints(query),
            repo.getCountrySectorBreakdown(query),
            repo.getCountryRegistryBreakdown(query),
            repo.getStatusAggregates(query),
            repo.getMethodologyAggregates(query),
            repo.getPortfolioMetrics(query),
            repo.getDeveloperAggregates(query),
            repo.getRegistryStatusBreakdown(query),
            repo.getLifecycleStageAggregates(query),
        ]);

        const result = this.buildSummary(
            totals, filterOptions, countries, registries, sectors, vintages, mapPoints,
            countrySectors, countryRegistries, statuses, methodologies, portfolio,
            developers, registryStatuses, lifecycleStages,
        );
        await this.redis.setJson(cacheKey, result, CACHE_TTL_SECONDS);
        return result;
    }

    private cacheKey(scope: string, network: string, query: DashboardMintQuery): string {
        return `dashboard:${scope}:${network}:${query.registry ?? ''}:${query.developer ?? ''}`;
    }

    private buildSummary(
        totals: TotalsRow,
        filterOptions: FilterOptionsRow,
        countries: CountryAggRow[],
        registries: LabelAggRow[],
        sectors: LabelAggRow[],
        vintages: LabelAggRow[],
        mapPoints: MapPointRow[],
        countrySectors: CountryBreakdownRow[],
        countryRegistries: CountryBreakdownRow[],
        statuses: LabelAggRow[],
        methodologies: LabelAggRow[],
        portfolio: PortfolioMetricsRow,
        developers: DeveloperAggRow[],
        registryStatuses: RegistryStatusRow[],
        lifecycleStages: LabelAggRow[],
    ): DashboardSummaryDto {
        const toNumberOrNull = (v: string | null): number | null => {
            if (v === null) return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const toLabelCount = (rows: LabelAggRow[]): LabelCountDto[] => rows.map(r => ({
            label: r.label,
            projectCount: Number(r.projects) || 0,
            credits: Number(r.credits) || 0,
            methodologies: Number(r.methodologies) || 0,
        }));

        const toBreakdown = (rows: CountryBreakdownRow[]) => rows.map(r => ({
            country: r.country,
            label: r.label,
            projectCount: Number(r.projects) || 0,
            credits: Number(r.credits) || 0,
        }));

        return {
            totals: {
                registries: Number(totals.registries) || 0,
                methodologies: Number(totals.methodologies) || 0,
                projects: Number(totals.projects) || 0,
                filteredRegistries: Number(totals.filtered_registries) || 0,
                filteredMethodologies: Number(totals.filtered_methodologies) || 0,
            },
            filterOptions: {
                developers: (filterOptions.developers ?? []).sort((a, b) => a.localeCompare(b)),
                registries: (filterOptions.registries ?? []).sort((a, b) => a.localeCompare(b)),
            },
            countries: countries.map(r => ({
                country: r.country,
                projects: Number(r.projects) || 0,
                credits: Number(r.credits) || 0,
                methodologies: Number(r.methodologies) || 0,
                developer: r.developer,
                registry: r.registry,
            })),
            registries: toLabelCount(registries),
            sectors: toLabelCount(sectors),
            vintages: toLabelCount(vintages),
            countrySectors: toBreakdown(countrySectors),
            countryRegistries: toBreakdown(countryRegistries),
            statuses: toLabelCount(statuses),
            lifecycleStages: toLabelCount(lifecycleStages),
            methodologies: toLabelCount(methodologies),
            developers: developers.map(d => ({
                label: d.label,
                projectCount: Number(d.projects) || 0,
                credits: Number(d.credits) || 0,
                countryCount: Number(d.country_count) || 0,
                sectorCount: Number(d.sector_count) || 0,
            })),
            registryStatuses: registryStatuses.map(r => ({
                registry: r.registry,
                status: r.status,
                projectCount: Number(r.projects) || 0,
            })),
            portfolio: {
                totalIssued: Number(portfolio.total_issued) || 0,
                totalRetired: Number(portfolio.total_retired) || 0,
                totalActive: Number(portfolio.total_active) || 0,
                avgVintageYear: (() => {
                    const v = toNumberOrNull(portfolio.avg_vintage_year);
                    return v === null ? null : Math.round(v);
                })(),
                avgCreditingPeriodYears: (() => {
                    const v = toNumberOrNull(portfolio.avg_crediting_period_years);
                    return v === null ? null : Math.round(v * 10) / 10;
                })(),
            },
            mapPoints: mapPoints
                .map(r => ({
                    name: r.name,
                    lat: Number(r.lat),
                    lng: Number(r.lng),
                    credits: Number(r.credits) || 0,
                }))
                // Drop non-numeric coordinates and the 0/0 "null island" marker.
                .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)),
        };
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
}
