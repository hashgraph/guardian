import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '@shared/redis/redis.service';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import {
    PgPortfolioRepository,
    PortfolioProjectTotalRow,
    PortfolioMonthRow,
    PortfolioRecentIssuanceRow,
} from '../repositories/pg-portfolio.repository';
import { PortfolioStatsDto } from '../dto/portfolio.dto';

const CACHE_TTL_SECONDS = 60; // matches the materialized view / mint-stats refresh interval

@Injectable()
export class PortfolioStatsService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
    ) {}

    async getStats(userId: string, network: string, projectKeys: string[]): Promise<PortfolioStatsDto> {
        const sorted = [...projectKeys].sort();
        const key = this.cacheKey(userId, network, sorted);

        const cached = await this.redis.getJson<PortfolioStatsDto>(key);
        if (cached) return cached;

        const repo = new PgPortfolioRepository(this.dataSources.getDataSource(network));
        const [totals, series, recent, retirements] = await repo.getAggregations(sorted);

        const result = this.pivot(totals, series, recent, retirements);
        await this.redis.setJson(key, result, CACHE_TTL_SECONDS);
        return result;
    }

    // Sorted-key hash keeps the cache key order-independent (same watchlist,
    // any submission order, hits the same entry) and userId-scoped so one
    // user's aggregates are never served to another. TTL alone bounds memory —
    // no manual LRU needed, unlike an in-memory Map under per-user keys.
    private cacheKey(userId: string, network: string, sortedProjectKeys: string[]): string {
        const hash = createHash('sha1').update(sortedProjectKeys.join('|')).digest('hex');
        return `portfolio-stats:${userId}:${network}:${hash}`;
    }

    /** Postgres may hand back a Date or a date string; both become 'YYYY-MM-01'. */
    private static toMonthSeries(rows: PortfolioMonthRow[]): Array<{ month: string; amount: number }> {
        return rows.map(row => ({
            month: (row.month instanceof Date
                ? row.month.toISOString().slice(0, 7)
                : String(row.month).slice(0, 7)) + '-01',
            amount: Number(row.amount) || 0,
        }));
    }

    private pivot(
        totals: PortfolioProjectTotalRow[],
        series: PortfolioMonthRow[],
        recent: PortfolioRecentIssuanceRow[],
        retirements: PortfolioMonthRow[],
    ): PortfolioStatsDto {
        let totalMinted = 0;
        const byProjectKey = totals.map(row => {
            const amount = Number(row.amount) || 0;
            totalMinted += amount;
            return { projectKey: row.projectKey, amount };
        });

        const mintSeries = PortfolioStatsService.toMonthSeries(series);
        const retirementSeries = PortfolioStatsService.toMonthSeries(retirements);

        const recentIssuances = recent.map(row => ({
            projectKey: row.projectKey,
            tokenId: row.tokenId ?? null,
            amount: row.amount != null ? Number(row.amount) : null,
            mintDate: row.mintDate ? row.mintDate.toISOString() : null,
        }));

        return { totalMinted, byProjectKey, mintSeries, recentIssuances, retirementSeries };
    }
}
