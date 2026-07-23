import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../dto/pagination.dto';
import { DeveloperQueryDto, DeveloperResponseDto } from '../dto/developer.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgDeveloperRepository } from '../repositories/pg-developer.repository';
import { DeveloperRepository } from '../repositories/developer.repository';

@Injectable()
export class DevelopersService {
    constructor(private readonly dataSources: NetworkDataSourceRegistry) {}

    async findAll(
        network: string,
        query: DeveloperQueryDto,
    ): Promise<PaginatedResponse<DeveloperResponseDto>> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const result = await repo.findAll({
            page,
            limit,
            search: query.search,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
            country: query.country,
        });

        const data = result.rows.map(row => DeveloperResponseDto.fromRow(row, network));
        return new PaginatedResponse(data, result.total, page, limit);
    }

    private getRepository(network: string): DeveloperRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgDeveloperRepository(ds);
    }
}
