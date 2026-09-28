import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgIssuanceRepository } from '../repositories/pg-issuance.repository';
import { IssuanceRepository } from '../repositories/issuance.repository';
import { PgProjectRepository } from '../repositories/pg-project.repository';
import { PaginatedResponse } from '../dto/pagination.dto';
import {
    IssuanceSummaryDto,
    IssuanceTokenInfoDto,
    PaginatedRelatedIssuancesDto,
} from '../dto/issuance.dto';
import { MintSerialsResponseDto, MintTransactionsResponseDto } from '../dto/project.dto';

// Short TTL, matching ProjectsService.findById — this reads through
// project_mint_link's live reconciliation (declared vs. minted, serial
// counts), which the worker updates on ingest, not on a fixed cadence.
const FIND_SUMMARY_CACHE_TTL_SECONDS = 30;

/**
 * Serves the issuance detail page.
 *
 * Serials and transactions delegate to the project repository with a null
 * project id: those routes address a mint directly, so there is no project
 * namespace to guard against — unlike the project-scoped routes, which must
 * keep their ownership check.
 */
@Injectable()
export class IssuanceService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly redis: RedisService,
    ) {}

    private getRepository(network: string): IssuanceRepository {
        return new PgIssuanceRepository(this.dataSources.getDataSource(network));
    }

    private getProjectRepository(network: string): PgProjectRepository {
        return new PgProjectRepository(this.dataSources.getDataSource(network));
    }

    private notFound(network: string, mintConsensusTimestamp: string): NotFoundException {
        return new NotFoundException(
            `Issuance "${mintConsensusTimestamp}" not found on ${network}`,
        );
    }

    async findSummary(network: string, mintConsensusTimestamp: string): Promise<IssuanceSummaryDto> {
        const cacheKey = `issuance-summary:${network}:${mintConsensusTimestamp}`;
        const cached = await this.redis.getJson<IssuanceSummaryDto>(cacheKey);
        if (cached) return cached;

        const row = await this.getRepository(network).findSummary(mintConsensusTimestamp);
        if (!row) throw this.notFound(network, mintConsensusTimestamp);

        await this.redis.setJson(cacheKey, row, FIND_SUMMARY_CACHE_TTL_SECONDS);
        return row;
    }

    async findTokenInfo(network: string, mintConsensusTimestamp: string): Promise<IssuanceTokenInfoDto> {
        const row = await this.getRepository(network).findTokenInfo(mintConsensusTimestamp);
        if (!row) throw this.notFound(network, mintConsensusTimestamp);
        return row;
    }

    async findRelatedIssuances(
        network: string,
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<PaginatedRelatedIssuancesDto> {
        const result = await this.getRepository(network)
            .findRelatedIssuances(mintConsensusTimestamp, page, limit);
        if (!result) throw this.notFound(network, mintConsensusTimestamp);
        return new PaginatedResponse(result.issuances, result.total, page, limit);
    }

    async findSerials(
        network: string,
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<MintSerialsResponseDto> {
        const result = await this.getProjectRepository(network)
            .findMintSerials(null, mintConsensusTimestamp, page, limit);
        if (!result) throw this.notFound(network, mintConsensusTimestamp);
        const { ranges, totalRanges, ...rest } = result;
        return { ...rest, ...new PaginatedResponse(ranges, totalRanges, page, limit) };
    }

    async findTransactions(
        network: string,
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
        sortBy?: string,
        sortDir?: 'asc' | 'desc',
    ): Promise<MintTransactionsResponseDto> {
        const result = await this.getProjectRepository(network)
            .findMintTransactions(null, mintConsensusTimestamp, page, limit, sortBy, sortDir);
        if (!result) throw this.notFound(network, mintConsensusTimestamp);
        return {
            mintConsensusTimestamp,
            transferHistorySynced: result.transferHistorySynced,
            ...new PaginatedResponse(result.transactions, result.total, page, limit),
        };
    }
}
