import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '@shared/redis/redis.service';
import { SingleFlightService } from '@shared/single-flight/single-flight.service';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgActivityRepository, ActivityFilters } from '../repositories/pg-activity.repository';
import { NetworkActivityItemDto } from '../dto/activity.dto';

const LIMIT = 10;

// Shorter than the rest of the dashboard (60s) — this feed is meant to feel
// live, and its underlying data (message/business_view) is written
// continuously by the worker rather than refreshed on a materialized-view
// schedule.
const CACHE_TTL_SECONDS = 30;

@Injectable()
export class ActivityService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
        private readonly singleFlight: SingleFlightService,
    ) {}

    /**
     * Wrapped in SingleFlightService: this feed's worst-case query (a 6-branch
     * UNION ALL over `message`) is the slowest in the app, and its TTL is the
     * shortest of any cached endpoint. Without dedup, every concurrent
     * request landing during a cache-miss window ran that query independently
     * — the single highest-risk stampede case identified in the perf audit.
     */
    async getNetworkActivity(network: string, filters: ActivityFilters = {}): Promise<NetworkActivityItemDto[]> {
        const cacheKey = this.cacheKey(network, filters);
        const cached = await this.redis.getJson<NetworkActivityItemDto[]>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            const cachedAgain = await this.redis.getJson<NetworkActivityItemDto[]>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = new PgActivityRepository(this.dataSources.getDataSource(network));
            const rows = await repo.getRecentActivity(LIMIT, filters);
            const result = rows.map(NetworkActivityItemDto.fromRow);

            await this.redis.setJson(cacheKey, result, CACHE_TTL_SECONDS);
            return result;
        });
    }

    private cacheKey(network: string, filters: ActivityFilters): string {
        const { projectKeys, registry, developer } = filters;
        if (!projectKeys?.length && !registry && !developer) return `activity:${network}:global`;
        const parts = [
            projectKeys?.length ? `pk:${[...projectKeys].sort().join('|')}` : '',
            registry ? `reg:${registry}` : '',
            developer ? `dev:${developer}` : '',
        ].join(';');
        const hash = createHash('sha1').update(parts).digest('hex');
        return `activity:${network}:${hash}`;
    }
}
