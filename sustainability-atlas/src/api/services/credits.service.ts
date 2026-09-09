import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { createHash } from 'crypto';
import { CreditQueryDto, CreditResponseDto, CreditStatsDto } from '../dto/credit.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgCreditRepository } from '../repositories/pg-credit.repository';
import { CreditRepository, CreditRawDetail, CreditListQuery } from '../repositories/credit.repository';

const STATS_CACHE_TTL_SECONDS = 60;

@Injectable()
export class CreditsService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
    ) {}

    async findAll(
        network: string,
        query: CreditQueryDto,
    ): Promise<PaginatedResponse<CreditResponseDto>> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const result = await repo.findAll({
            ...this.toFilters(query),
            page,
            limit,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });

        const data = result.rows.map(row => CreditResponseDto.fromRow(row, network));
        return new PaginatedResponse(data, result.total, page, limit);
    }

    /** Aggregates over the entire filtered set, so the UI never derives totals from one page. */
    async findStats(network: string, query: CreditQueryDto): Promise<CreditStatsDto> {
        const filters = this.toFilters(query);
        const cacheKey = `credit-stats:${network}:${createHash('sha1')
            .update(JSON.stringify(filters))
            .digest('hex')}`;

        const cached = await this.redis.getJson<CreditStatsDto>(cacheKey);
        if (cached) return cached;

        const stats = await this.getRepository(network).findStats({ ...filters, page: 1, limit: 1 });
        await this.redis.setJson(cacheKey, stats, STATS_CACHE_TTL_SECONDS);
        return stats;
    }

    /** Filter fields shared by the list, its count and the stats aggregate. */
    private toFilters(query: CreditQueryDto): Omit<CreditListQuery, 'page' | 'limit'> {
        return {
            search: query.search,
            type: query.type,
            registry: query.registry,
            registryDid: query.registryDid,
            tokenId: query.tokenId,
            projectKey: query.projectKey,
            methodologyId: query.methodologyId,
            linkedOnly: query.linkedOnly,
            supplyMin: query.supplyMin,
            supplyMax: query.supplyMax,
            mintDateFrom: query.mintDateFrom,
            mintDateTo: query.mintDateTo,
        };
    }

    async findRaw(network: string, tokenId: string): Promise<CreditRawDetail | null> {
        const repo = this.getRepository(network);
        return repo.findRaw(tokenId);
    }

    /**
     * Resolves the appropriate CreditRepository for the given network.
     * Currently only PostgreSQL is supported; add a factory here to swap
     * in a different backend implementation.
     */
    private getRepository(network: string): CreditRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgCreditRepository(ds);
    }
}
