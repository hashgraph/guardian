import { Injectable } from '@nestjs/common';
import { RegistryQueryDto, RegistryResponseDto } from '../dto/registry.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgRegistryRepository } from '../repositories/pg-registry.repository';
import { RegistryRepository } from '../repositories/registry.repository';

@Injectable()
export class RegistriesService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
    ) {}

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
