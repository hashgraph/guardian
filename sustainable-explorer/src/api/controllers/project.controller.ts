import { Controller, Get, Post, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProjectsService } from '../services/project.service';
import { ProjectExportService, type ExportFormat } from '../services/project-export.service';
import { PolicyWorkflowGraph } from '../services/policy-graph.builder';
import {
    ProjectQueryDto,
    ProjectResponseDto,
    PaginatedProjectsDto,
    ActivityEventDto,
} from '../dto/project.dto';
import { AdditionalDetailsSchemaDto } from '../dto/additional-details.dto';

const VALID_EXPORT_FORMATS = new Set<string>(['iwa', 'cadtrust', 'cdop']);

@ApiTags('projects')
@Controller('api/v1/:network/projects')
export class ProjectsController {
    constructor(
        private readonly projectsService: ProjectsService,
        private readonly projectExportService: ProjectExportService,
    ) {}

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
            'published on the project\'s Hedera topic, enriched with schema names from the policy zip.',
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

    // TODO: gate behind admin auth once decided
    @Post(':id/re-extract')
    @ApiOperation({
        summary: 'Re-extract a project from its already-attached VCs',
        description:
            'Enqueues one PROJECT_REPARSE job per VC that was previously attached to this project ' +
            'via businessData->linkedVcs. Useful after a field-mapping update when only one project ' +
            'needs refreshing — faster than running the per-methodology reparse. ' +
            'Returns immediately; jobs are processed asynchronously by the worker. ' +
            'Returns { enqueued: 0 } when the project has no linkedVcs yet.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({
        name: 'id',
        description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project',
    })
    @ApiResponse({
        status: 201,
        description: 'Reparse jobs enqueued',
        schema: {
            type: 'object',
            properties: {
                enqueued: { type: 'number', description: 'Number of PROJECT_REPARSE jobs enqueued' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async reextractProject(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<{ enqueued: number }> {
        return this.projectsService.reextractProject(network, id);
    }

    // TODO: gate behind admin auth once decided
    @Post(':id/refresh-ipfs')
    @ApiOperation({
        summary: 'Force IPFS re-fetch + project reparse for every VC in this project\'s topic',
        description:
            'Stronger sibling of /re-extract. Targets every VC in the project\'s ' +
            'relatedTopicId — re-fetches IPFS for those whose documents are still null ' +
            '(clearing stale failure records and stale BullMQ jobs so the fetches actually ' +
            'run), and re-enqueues a PROJECT_REPARSE for those already fetched. Use this ' +
            'when a project page shows incomplete data because part of its VC chain never ' +
            'came down from IPFS.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({
        name: 'id',
        description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project',
    })
    @ApiResponse({
        status: 201,
        description: 'Refresh + reparse jobs enqueued',
        schema: {
            type: 'object',
            properties: {
                refreshed: { type: 'number', description: 'Number of IPFS fetch jobs enqueued' },
                reparseEnqueued: { type: 'number', description: 'Number of reparse jobs enqueued' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async refreshIpfsAndReparseProject(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<{ refreshed: number; reparseEnqueued: number }> {
        return this.projectsService.refreshIpfsAndReparseProject(network, id);
    }

    @Get(':id/linked-vcs/:consensusTimestamp')
    @ApiOperation({
        summary: 'Get the raw VC document for a single linked VC',
        description:
            'Returns the full JSONB VC document from the message table for the specified ' +
            'consensusTimestamp. The timestamp must appear in the project\'s businessData->linkedVcs ' +
            'list — this check prevents arbitrary message fetches via the project namespace. ' +
            'Use the linkedSchemas field on GET /:id to enumerate valid timestamps.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({
        name: 'id',
        description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project',
    })
    @ApiParam({
        name: 'consensusTimestamp',
        description: 'HCS consensus timestamp of the linked VC message (e.g. "1234567890.123456789")',
    })
    @ApiResponse({
        status: 200,
        description: 'Raw VC document (JSONB)',
        schema: { type: 'object', additionalProperties: true },
    })
    @ApiResponse({ status: 404, description: 'Project not found, VC not linked to this project, or no document stored' })
    async getLinkedVcDocument(
        @Param('network') network: string,
        @Param('id') id: string,
        @Param('consensusTimestamp') consensusTimestamp: string,
    ): Promise<Record<string, unknown>> {
        return this.projectsService.getLinkedVcDocument(network, id, consensusTimestamp);
    }

    @Get(':id/vc-evidence/:consensusTimestamp')
    @ApiOperation({
        summary: 'Get the raw VC document and schema field labels for a single linked VC',
        description:
            'Returns the full JSONB VC document from the message table together with a ' +
            'fieldLabels map (credentialSubject key → human-readable label from the policy ' +
            'schemaFields).  The consensusTimestamp must appear in the project\'s ' +
            'businessData->linkedVcs list.  fieldLabels is an empty object when the policy ' +
            'schema cannot be resolved — callers must fall back gracefully.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({
        name: 'id',
        description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project',
    })
    @ApiParam({
        name: 'consensusTimestamp',
        description: 'HCS consensus timestamp of the linked VC message (e.g. "1234567890.123456789")',
    })
    @ApiResponse({
        status: 200,
        description: 'Raw VC document and per-field label map',
        schema: {
            type: 'object',
            properties: {
                document: { type: 'object', additionalProperties: true },
                fieldLabels: { type: 'object', additionalProperties: { type: 'string' } },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Project not found, VC not linked to this project, or no document stored' })
    async getLinkedVcEvidence(
        @Param('network') network: string,
        @Param('id') id: string,
        @Param('consensusTimestamp') consensusTimestamp: string,
    ): Promise<{ document: Record<string, unknown>; fieldLabels: Record<string, string> }> {
        return this.projectsService.getLinkedVcEvidence(network, id, consensusTimestamp);
    }

    @Get(':id/policy-graph')
    @ApiOperation({
        summary: 'Get the methodology workflow graph for a project',
        description:
            'Returns the policy.json-derived workflow graph: role swimlanes of document/action ' +
            'steps and the real flow edges between them (UI-refresh events are filtered out). ' +
            'Each node carries its schema UUID so the frontend can overlay VC availability. ' +
            'Returns an empty graph ({roles:[],nodes:[],edges:[]}) when the project has no decoded policy.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiResponse({ status: 200, description: 'Policy workflow graph (roles, nodes, edges)' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async getPolicyGraph(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<PolicyWorkflowGraph> {
        return this.projectsService.getPolicyGraph(network, id);
    }

    @Get(':id/policy-json')
    @ApiOperation({
        summary: 'Get the raw decoded policy.json for a project',
        description: 'Returns the full policy.json document of the project\'s decoded policy, ' +
            'for the in-app JSON inspector. Returns null when no decoded policy exists.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiResponse({ status: 200, description: 'Raw policy.json (or null)' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async getPolicyJson(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<Record<string, unknown> | null> {
        return this.projectsService.getPolicyJson(network, id);
    }

    @Get(':id/additional-details')
    @ApiOperation({
        summary: 'Get a project\'s decoded "Detailed Information"',
        description:
            'Returns the project\'s linked VC documents decoded into structured fields, tables ' +
            'and groups with human-readable titles, grouped by schema (one record per linked VC). ' +
            'Served from the precomputed message.decodedDetails; VCs not yet backfilled are decoded ' +
            'on the fly. The MintToken schema is excluded.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiResponse({ status: 200, type: [AdditionalDetailsSchemaDto], description: 'Decoded details grouped by schema' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async getAdditionalDetails(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<AdditionalDetailsSchemaDto[]> {
        return this.projectsService.getAdditionalDetails(network, id);
    }

    @Get(':id/export/:format')
    @ApiOperation({
        summary: 'Export a project in a standard format (IWA DMRV, CADTrust V2, or CDOP)',
        description:
            'Returns the project data structured according to the requested standard. ' +
            'The field paths in the output are grouped hierarchically by standard entity. ' +
            'Available formats: iwa, cadtrust, cdop.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey' })
    @ApiParam({ name: 'format', enum: ['iwa', 'cadtrust', 'cdop'], description: 'Export standard format' })
    @ApiResponse({ status: 200, description: 'Exported project data in the requested standard format' })
    @ApiResponse({ status: 400, description: 'Invalid export format' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async exportProject(
        @Param('network') network: string,
        @Param('id') id: string,
        @Param('format') format: string,
    ): Promise<Record<string, unknown>> {
        if (!VALID_EXPORT_FORMATS.has(format)) {
            throw new BadRequestException(`Invalid export format "${format}". Valid: iwa, cadtrust, cdop`);
        }
        const project = await this.projectsService.findById(network, id);
        if (!project) {
            throw new NotFoundException(`Project with ID "${id}" not found on ${network}`);
        }
        return this.projectExportService.exportProject(project, format as ExportFormat);
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
