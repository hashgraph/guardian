import { Injectable } from '@nestjs/common';
import { ProjectQueryDto, ProjectResponseDto, ActivityEventDto, ProjectIdsDto } from '../dto/project.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgProjectRepository } from '../repositories/pg-project.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { MappingReprocessService } from './mapping-reprocess.service';
import { PolicyWorkflowGraph } from './policy-graph.builder';
import { AdditionalDetailsSchemaDto } from '../dto/additional-details.dto';

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
            sdgs: query.sdgs,
        });

        const data = result.rows.map(row => ProjectResponseDto.fromRow(row, network, false));
        return new PaginatedResponse(data, result.total, page, limit);
    }

    /**
     * Same filters as findAll, but returns only (sourceTimestamp, name) pairs —
     * for the "add all matching" bulk-select action once browsing is
     * paginated, so the client doesn't have to download every matching
     * project's full row just to collect ids.
     *
     * Reuses findAll/fromRow rather than a parallel lean query: the display
     * `name` isn't a plain column — ProjectResponseDto.fromRow falls back
     * through the linked project-schema name (and then methodology) whenever
     * the stored displayName looks like a bare DID/topic id, which needs the
     * same policy-schema batch-load findAll already does. Reimplementing that
     * for a lean query would either duplicate it or show the wrong name for
     * exactly the projects that need the fallback. limit=5000 is a generous
     * cap for a user-triggered bulk action, not a route millions of rows
     * would ever hit — the point is avoiding a second name-resolution
     * algorithm, not shaving a few joins off an infrequent request.
     */
    async findIds(network: string, query: ProjectQueryDto): Promise<ProjectIdsDto> {
        const repo = this.getRepository(network);
        const result = await repo.findAll({
            page: 1,
            limit: 5000,
            search: query.search,
            name: query.name,
            country: query.country,
            methodology: query.methodology,
            registry: query.registry,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
            policyTopicId: query.policyTopicId,
            instanceTopicId: query.instanceTopicId,
            sdgs: query.sdgs,
        });
        const items = result.rows.map(row => {
            const dto = ProjectResponseDto.fromRow(row, network, false);
            return { id: dto.sourceTimestamp, name: dto.name ?? dto.sourceTimestamp };
        });
        return { items };
    }

    /**
     * Batch-fetches projects by sourceTimestamp ID (the watchlist's stored ID),
     * reusing findAll's row-shaping and N+1-avoidance schema-loading rather than
     * a parallel implementation. limit=200 comfortably covers the watchlist size
     * cap (Phase 5), so one page always returns the whole batch.
     */
    async findByIds(network: string, sourceTimestamps: string[]): Promise<ProjectResponseDto[]> {
        const repo = this.getRepository(network);
        const result = await repo.findAll({
            page: 1,
            limit: 200,
            sourceTimestamps,
        });
        return result.rows.map(row => ProjectResponseDto.fromRow(row, network, false));
    }

    async findById(network: string, id: string): Promise<ProjectResponseDto | null> {
        const repo = this.getRepository(network);
        const row = await repo.findById(id);
        if (!row) return null;
        return ProjectResponseDto.fromRow(row, network, true);
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
     * Returns the raw VC document plus a per-field label map derived from the
     * policy's schemaFields.  Delegates entirely to MappingReprocessService.
     */
    async getLinkedVcEvidence(
        network: string,
        projectId: string,
        consensusTimestamp: string,
    ): Promise<{ document: Record<string, unknown>; fieldLabels: Record<string, string> }> {
        return this.mappingReprocessService.getLinkedVcEvidence(network, projectId, consensusTimestamp);
    }

    /**
     * Returns the project's "Detailed Information" — decoded VC payloads grouped
     * by schema. Delegates to MappingReprocessService.
     */
    async getAdditionalDetails(network: string, id: string): Promise<AdditionalDetailsSchemaDto[]> {
        return this.mappingReprocessService.getAdditionalDetails(network, id);
    }

    /**
     * Returns the methodology workflow graph (role swimlanes + real flow edges)
     * for a project's policy, extracted from policy.json. Delegates to
     * MappingReprocessService.
     */
    async getPolicyGraph(network: string, id: string): Promise<PolicyWorkflowGraph> {
        return this.mappingReprocessService.getPolicyGraph(network, id);
    }

    /** Raw decoded policy.json for the project's policy (JSON inspector). */
    async getPolicyJson(network: string, id: string): Promise<Record<string, unknown> | null> {
        return this.mappingReprocessService.getPolicyJson(network, id);
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
