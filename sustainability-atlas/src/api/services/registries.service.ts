import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { SingleFlightService } from '@shared/single-flight/single-flight.service';
import { RegistryQueryDto, RegistryResponseDto } from '../dto/registry.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgRegistryRepository } from '../repositories/pg-registry.repository';
import { RegistryRepository } from '../repositories/registry.repository';

/** Matches MV_REFRESH_INTERVAL — dropdown options can't be fresher than the stats they're filtered by. */
const OPTIONS_CACHE_TTL_SECONDS = 60;

/**
 * Also matches MV_REFRESH_INTERVAL: the per-registry stats on every row come from
 * mv_registry_stats, so a cached page must never outlive the MV it was built from.
 */
const SEARCH_CACHE_TTL_SECONDS = 60;

@Injectable()
export class RegistriesService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
        private readonly singleFlight: SingleFlightService,
    ) {}

    /** Distinct registry names for filter dropdowns. Cached — the set changes only when the worker ingests a new registry. */
    async findNameOptions(network: string, hideEmpty = true): Promise<string[]> {
        const cacheKey = `registry-options:${network}:${hideEmpty ? '1' : '0'}`;
        const cached = await this.redis.getJson<string[]>(cacheKey);
        if (cached) return cached;

        const names = await this.getRepository(network).findNameOptions(hideEmpty);
        await this.redis.setJson(cacheKey, names, OPTIONS_CACHE_TTL_SECONDS);
        return names;
    }

    /**
     * Cache-aside + single-flight. The search predicate runs against the whole
     * REGISTRY population, so identical concurrent searches (two tabs, two users,
     * or a debounce-timing race) collapse onto one DB round trip, and a repeat of
     * the same search inside the TTL window never reaches the database at all.
     */
    async findAll(
        network: string,
        query: RegistryQueryDto,
    ): Promise<PaginatedResponse<RegistryResponseDto>> {
        const cacheKey = this.searchCacheKey(network, query);
        const cached = await this.redis.getJson<PaginatedResponse<RegistryResponseDto>>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            // Re-check: another request may have populated the cache while this
            // one was waiting to be scheduled onto the event loop.
            const cachedAgain = await this.redis.getJson<PaginatedResponse<RegistryResponseDto>>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = this.getRepository(network);
            const page = query.page ?? 1;
            const limit = query.limit ?? 20;

            const result = await repo.findAll({
                page,
                limit,
                search: query.search,
                displayName: query.displayName,
                did: query.did,
                id: query.id,
                tags: query.tags,
                geography: query.geography,
                law: query.law,
                hideEmpty: query.hideEmpty,
                createdAtFrom: query.createdAtFrom,
                createdAtTo: query.createdAtTo,
                sortBy: query.sortBy,
                sortDir: query.sortDir,
            });

            const data = result.rows.map(row =>
                RegistryResponseDto.fromRow(row, network, row.stats),
            );
            const response = new PaginatedResponse(data, result.total, page, limit);
            await this.redis.setJson(cacheKey, response, SEARCH_CACHE_TTL_SECONDS);
            return response;
        });
    }

    /**
     * Keys are sorted before serializing: the DTO is materialised from the request's
     * query string, so two requests carrying the same filters in a different order
     * would otherwise serialize differently and miss each other's cache entry.
     */
    private searchCacheKey(network: string, query: RegistryQueryDto): string {
        const normalized = Object.fromEntries(
            Object.entries(query as Record<string, unknown>)
                .filter(([, value]) => value !== undefined)
                .sort(([a], [b]) => a.localeCompare(b)),
        );
        return `registries-search:${network}:${JSON.stringify(normalized)}`;
    }

    async findByDid(network: string, did: string): Promise<RegistryResponseDto | null> {
        const repo = this.getRepository(network);
        const row = await repo.findByDid(did);
        if (!row) return null;
        return RegistryResponseDto.fromRow(row, network, row.stats);
    }

    async findById(network: string, id: string): Promise<RegistryResponseDto | null> {
        const repo = this.getRepository(network);
        const row = await repo.findById(id);
        if (!row) return null;
        return RegistryResponseDto.fromRow(row, network, row.stats);
    }

    /**
     * Resolves the appropriate RegistryRepository for the given network.
     * Currently only PostgreSQL is supported; add a factory here to swap
     * in a different backend implementation.
     */
    private getRepository(network: string): RegistryRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgRegistryRepository(ds);
    }
}
