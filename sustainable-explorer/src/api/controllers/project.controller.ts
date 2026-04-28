import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProjectsService } from '../services/project.service';
import {
    ProjectQueryDto,
    ProjectResponseDto,
    PaginatedProjectsDto,
    ActivityEventDto,
} from '../dto/project.dto';

@ApiTags('projects')
@Controller('api/v1/:network/projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    @ApiOperation({
        summary: 'List Projects',
        description:
            'Returns a paginated list of carbon credit Projects for the specified network. ' +
            'Supports full-text search, filtering by name, country, methodology, developer, ' +
            'registry, vintage, and status, plus sorting.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({ status: 200, type: PaginatedProjectsDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(
        @Param('network') network: string,
        @Query() query: ProjectQueryDto,
    ) {
        return this.projectsService.findAll(network, query);
    }

    @Get(':id/activity')
    @ApiOperation({
        summary: 'Get Activity Log for a Project',
        description:
            'Returns a list of activity events derived from VC-Document and VP-Document messages ' +
            'published on the project\'s Hedera topic, enriched with schema names from policy_schema.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) of the project' })
    @ApiResponse({ status: 200, type: [ActivityEventDto] })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async findActivity(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<ActivityEventDto[]> {
        const project = await this.projectsService.findById(network, id);
        if (!project) {
            throw new NotFoundException(`Project with ID "${id}" not found on ${network}`);
        }
        return this.projectsService.findActivity(network, id);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get a Project by source timestamp',
        description:
            'Returns a single Project matching the given HCS consensus timestamp (sourceTimestamp) ' +
            'on the specified network.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({
        name: 'id',
        description: 'HCS consensus timestamp (sourceTimestamp) of the project',
    })
    @ApiResponse({ status: 200, type: ProjectResponseDto })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async findById(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<ProjectResponseDto> {
        const project = await this.projectsService.findById(network, id);
        if (!project) {
            throw new NotFoundException(`Project with ID "${id}" not found on ${network}`);
        }
        return project;
    }
}
