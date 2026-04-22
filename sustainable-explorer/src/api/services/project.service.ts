import { Injectable } from '@nestjs/common';
import { ProjectQueryDto, ProjectResponseDto } from '../dto/project.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgProjectRepository } from '../repositories/pg-project.repository';
import { ProjectRepository } from '../repositories/project.repository';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
    ) {}

    async findAll(
        network: string,
        query: ProjectQueryDto,
    ): Promise<PaginatedResponse<ProjectResponseDto>> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const result = await repo.findAll({
            page,
            limit,
            search: query.search,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
            name: query.name,
            country: query.country,
            methodology: query.methodology,
            registry: query.registry,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
        });

        const data = result.rows.map(row => ProjectResponseDto.fromRow(row, network));
        return new PaginatedResponse(data, result.total, page, limit);
    }

    async findById(network: string, id: string): Promise<ProjectResponseDto | null> {
        const repo = this.getRepository(network);
        const row = await repo.findById(id);
        if (!row) return null;
        return ProjectResponseDto.fromRow(row, network);
    }

    /**
     * Resolves the appropriate ProjectRepository for the given network.
     * Currently only PostgreSQL is supported; add a factory here to swap
     * in a different backend implementation.
     */
    private getRepository(network: string): ProjectRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgProjectRepository(ds);
    }
}
