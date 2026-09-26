import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { SingleFlightService } from '@shared/single-flight/single-flight.service';
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
import { deriveDashboardSummaryInputs } from './dashboard-aggregation.util';

// Matches MV_REFRESH_INTERVAL, so a cached response is never staler than the
// materialized views its numbers are read from.
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class DashboardService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
        private readonly singleFlight: SingleFlightService,
    ) {}

    async getMintStats(network: string, query: DashboardMintQuery): Promise<DashboardMintStatsDto> {
        const cacheKey = this.cacheKey('mint-stats', network, query);
        const cached = await this.redis.getJson<DashboardMintStatsDto>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            const cachedAgain = await this.redis.getJson<DashboardMintStatsDto>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = new PgDashboardRepository(this.dataSources.getDataSource(network));
            const [rows, retirementRows] = await Promise.all([
                repo.getMintAggregations(query),
                repo.getRetirementAggregations(query),
            ]);

            const result = this.aggregate(rows, retirementRows);
            await this.redis.setJson(cacheKey, result, CACHE_TTL_SECONDS);
            return result;
        });
    }

    /**
     * Every per-project aggregate the dashboard needs, in one response.
     *
     * Used to be 15 separate GROUP BY queries against the same PROJECT-scoped
     * rows — 12 of them just re-scanning/re-sorting an identical result set to
     * group it differently. Now it's 2 queries (the scoped project rows once,
     * plus the filter-independent dropdown/global-totals query), aggregated
     * into the same 15 shapes in Node via dashboard-aggregation.util.ts.
     * `buildSummary` below is unchanged — it still consumes exactly the same
     * 15 typed inputs it always did, so the DTO-mapping logic carries no risk
     * from this change.
     *
     * Wrapped in SingleFlightService: N concurrent requests hitting a
     * cache-miss window previously each queued their own 15-query fan-out
     * against the connection pool; dedup collapses that to one computation,
     * with the rest awaiting its result.
     */
    async getSummary(network: string, query: DashboardMintQuery): Promise<DashboardSummaryDto> {
        const cacheKey = this.cacheKey('summary', network, query);
        const cached = await this.redis.getJson<DashboardSummaryDto>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            const cachedAgain = await this.redis.getJson<DashboardSummaryDto>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = new PgDashboardRepository(this.dataSources.getDataSource(network));
            const [scopeRows, globalStats] = await Promise.all([
                repo.getProjectScopeRows(query),
                repo.getGlobalDashboardStats(),
            ]);

            const {
                totals, filterOptions, countries, registries, sectors, vintages, mapPoints,
                countrySectors, countryRegistries, statuses, methodologies, portfolio,
                developers, registryStatuses, lifecycleStages,
            } = deriveDashboardSummaryInputs(scopeRows, globalStats);

            const result = this.buildSummary(
                totals, filterOptions, countries, registries, sectors, vintages, mapPoints,
                countrySectors, countryRegistries, statuses, methodologies, portfolio,
                developers, registryStatuses, lifecycleStages,
            );
            await this.redis.setJson(cacheKey, result, CACHE_TTL_SECONDS);
            return result;
        });
    }

    private cacheKey(scope: string, network: string, query: DashboardMintQuery): string {
        return `dashboard:${scope}:${network}:${query.registry ?? ''}:${query.developer ?? ''}:${query.registryDid ?? ''}`;
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
                    id: r.projectKey,
                    name: r.name,
                    country: r.country,
                    lat: Number(r.lat),
                    lng: Number(r.lng),
                    credits: Number(r.credits) || 0,
                }))
                // Drop non-numeric coordinates and the 0/0 "null island" marker.
                .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)),
        };
    }

    /** Groups a row's month into the ISO key 'YYYY-MM-01' the series uses. */
    private static monthKey(month: Date | string | null): string | null {
        if (!month) return null;
        return (month instanceof Date
            ? month.toISOString().slice(0, 7)
            : String(month).slice(0, 7)) + '-01';
    }

    private aggregate(
        rows: Awaited<ReturnType<PgDashboardRepository['getMintAggregations']>>,
        retirementRows: Awaited<ReturnType<PgDashboardRepository['getRetirementAggregations']>>,
    ): DashboardMintStatsDto {
        let totalMinted = 0;
        const monthMap = new Map<string, number>();
        const sectorMap = new Map<string, number>();
        const registryMap = new Map<string, number>();

        let totalRetired = 0;
        const retirementMonthMap = new Map<string, number>();

        for (const row of retirementRows) {
            const amount = Number(row.amount) || 0;
            totalRetired += amount;
            const key = DashboardService.monthKey(row.month);
            if (key) {
                retirementMonthMap.set(key, (retirementMonthMap.get(key) ?? 0) + amount);
            }
        }

        for (const row of rows) {
            const amount = Number(row.amount) || 0;
            totalMinted += amount;

            // Monthly series — key is ISO month string 'YYYY-MM-01'
            const monthKey = DashboardService.monthKey(row.month);
            if (monthKey) {
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
            totalRetired,
            retirementSeries: [...retirementMonthMap.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, amount]) => ({ month, amount })),
        };
    }
}
