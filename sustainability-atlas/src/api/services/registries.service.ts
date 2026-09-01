import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { RegistryQueryDto, RegistryResponseDto } from '../dto/registry.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgRegistryRepository } from '../repositories/pg-registry.repository';
import { RegistryRepository } from '../repositories/registry.repository';

/** Matches MV_REFRESH_INTERVAL — dropdown options can't be fresher than the stats they're filtered by. */
const OPTIONS_CACHE_TTL_SECONDS = 60;

@Injectable()
export class RegistriesService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
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

    async findAll(
        network: string,
        query: RegistryQueryDto,
    ): Promise<PaginatedResponse<RegistryResponseDto>> {
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
        return new PaginatedResponse(data, result.total, page, limit);
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
