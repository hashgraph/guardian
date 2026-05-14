import { Injectable } from '@nestjs/common';
import { ProjectQueryDto, ProjectResponseDto, ActivityEventDto } from '../dto/project.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgProjectRepository } from '../repositories/pg-project.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { MappingReprocessService } from './mapping-reprocess.service';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly mappingReprocessService: MappingReprocessService,
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
            policyTopicId: query.policyTopicId,
            instanceTopicId: query.instanceTopicId,
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

    async findActivity(network: string, id: string): Promise<ActivityEventDto[]> {
        const repo = this.getRepository(network);
        const rows = await repo.findActivity(id);
        return rows.map(r => ActivityEventDto.fromRow(r));
    }

    /**
     * Re-enqueues PROJECT_REPARSE jobs for every VC already attached to this
     * project via businessData->linkedVcs. Delegates to MappingReprocessService
     * which owns the queue interaction.
     */
    async reextractProject(network: string, id: string): Promise<{ enqueued: number }> {
        return this.mappingReprocessService.reextractProject(network, id);
    }

    /**
     * Re-fetches IPFS for every VC in the project's topic (clearing failed
     * BullMQ jobs and ipfs_fetch_failure rows) and reparses already-fetched
     * VCs through the project mapper.
     */
    async refreshIpfsAndReparseProject(
        network: string,
        id: string,
    ): Promise<{ refreshed: number; reparseEnqueued: number }> {
        return this.mappingReprocessService.refreshIpfsAndReparseProject(network, id);
    }

    /**
     * Returns the raw VC document for a single linked VC, verifying that the
     * requested consensusTimestamp is in the project's linkedVcs list before
     * querying the message table.
     */
    async getLinkedVcDocument(
        network: string,
        projectId: string,
        consensusTimestamp: string,
    ): Promise<Record<string, unknown>> {
        return this.mappingReprocessService.getLinkedVcDocument(network, projectId, consensusTimestamp);
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
