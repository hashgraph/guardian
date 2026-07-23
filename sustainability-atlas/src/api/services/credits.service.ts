import { Injectable } from '@nestjs/common';
import { CreditQueryDto, CreditResponseDto } from '../dto/credit.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgCreditRepository } from '../repositories/pg-credit.repository';
import { CreditRepository, CreditRawDetail } from '../repositories/credit.repository';

@Injectable()
export class CreditsService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
    ) {}

    async findAll(
        network: string,
        query: CreditQueryDto,
    ): Promise<PaginatedResponse<CreditResponseDto>> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const result = await repo.findAll({
            page,
            limit,
            search: query.search,
            type: query.type,
            registry: query.registry,
            registryDid: query.registryDid,
            tokenId: query.tokenId,
            projectKey: query.projectKey,
            methodologyId: query.methodologyId,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });

        const data = result.rows.map(row => CreditResponseDto.fromRow(row, network));
        return new PaginatedResponse(data, result.total, page, limit);
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
