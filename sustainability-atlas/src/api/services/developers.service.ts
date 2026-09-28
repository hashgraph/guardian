import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { SingleFlightService } from '@shared/single-flight/single-flight.service';
import { PaginatedResponse } from '../dto/pagination.dto';
import { DeveloperQueryDto, DeveloperResponseDto } from '../dto/developer.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgDeveloperRepository } from '../repositories/pg-developer.repository';
import { DeveloperRepository } from '../repositories/developer.repository';

/**
 * Short by design: developers are an aggregate over PROJECT rows plus
 * mv_project_stats issuance figures, both of which move as the worker ingests,
 * so the listing is more volatile than the registry/methodology ones cached at
 * 60s. 20s is long enough to absorb a burst of keystroke-driven searches
 * without the page visibly lagging new projects.
 */
const SEARCH_CACHE_TTL_SECONDS = 20;

@Injectable()
export class DevelopersService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
        private readonly singleFlight: SingleFlightService,
    ) {}

    /**
     * Cache-aside + single-flight. Every search re-runs the full developer
     * aggregation before its predicate can be applied (the filter is on
     * post-GROUP BY columns, so no index can narrow it), which makes both the
     * repeat and the concurrent-duplicate case worth collapsing.
     */
    async findAll(
        network: string,
        query: DeveloperQueryDto,
    ): Promise<PaginatedResponse<DeveloperResponseDto>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const cacheKey = this.searchCacheKey(network, query);
        const cached = await this.redis.getJson<PaginatedResponse<DeveloperResponseDto>>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            // Re-check: another request may have populated the cache while this
            // one was waiting to be scheduled onto the event loop.
            const cachedAgain = await this.redis.getJson<PaginatedResponse<DeveloperResponseDto>>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = this.getRepository(network);
            const result = await repo.findAll({
                page,
                limit,
                search: query.search,
                sortBy: query.sortBy,
                sortDir: query.sortDir,
                country: query.country,
            });

            const data = result.rows.map(row => DeveloperResponseDto.fromRow(row, network));
            const response = new PaginatedResponse(data, result.total, page, limit);
            await this.redis.setJson(cacheKey, response, SEARCH_CACHE_TTL_SECONDS);
            return response;
        });
    }

    /**
     * Keys are sorted before serializing: the DTO is materialised from the
     * request's query string, so two requests carrying the same filters in a
     * different order would otherwise miss each other's cache entry.
     */
    private searchCacheKey(network: string, query: DeveloperQueryDto): string {
        const normalized = Object.fromEntries(
            Object.entries(query as Record<string, unknown>)
                .filter(([, value]) => value !== undefined)
                .sort(([a], [b]) => a.localeCompare(b)),
        );
        return `developers-search:${network}:${JSON.stringify(normalized)}`;
    }

    private getRepository(network: string): DeveloperRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgDeveloperRepository(ds);
    }
}
