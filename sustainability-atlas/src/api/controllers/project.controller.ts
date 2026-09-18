import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiCookieAuth } from '@nestjs/swagger';
import { ProjectsService } from '../services/project.service';
import { ProjectExportService, type ExportFormat } from '../services/project-export.service';
import { PolicyWorkflowGraph } from '../services/policy-graph.builder';
import {
    ProjectQueryDto,
    ProjectResponseDto,
    PaginatedProjectsDto,
    ActivityEventDto,
    BatchProjectsDto,
    ProjectIdsDto,
    ProjectFilterOptionsDto,
    MintSerialsResponseDto,
    MintTransactionsResponseDto,
} from '../dto/project.dto';
import { AdditionalDetailsSchemaDto } from '../dto/additional-details.dto';
import { MrvDataQueryDto, MrvDataResponseDto } from '../dto/mrv-data.dto';
import { PaginationQueryDto } from '../dto/pagination.dto';
import { AdminWrite } from '../auth/decorators/admin-write.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const VALID_EXPORT_FORMATS = new Set<string>(['iwa', 'cadtrust', 'cdop']);

@ApiTags('Projects')
@Controller('api/v1/:network/projects')
export class ProjectsController {
    constructor(
        private readonly projectsService: ProjectsService,
        private readonly projectExportService: ProjectExportService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Search and filter projects',
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

    @Get('filter-options')
    @ApiOperation({
        summary: 'Get the available project filter options',
        description:
            'Registries, developers, statuses, sectors, sectoral scopes, and vintages across ' +
            'the whole (unfiltered) project set. Backs the list page\'s filter dropdowns ' +
            'without requiring the client to load every project.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: ProjectFilterOptionsDto })
    async getFilterOptions(@Param('network') network: string): Promise<ProjectFilterOptionsDto> {
        return this.projectsService.getFilterOptions(network);
    }

    @Get('ids')
    @ApiOperation({
        summary: 'Get just the IDs of matching projects',
        description:
            'Same filters as the list endpoint (search, name, country, methodology, registry, ' +
            'developer, vintage, status, sdgs), but returns only sourceTimestamp IDs, with no ' +
            'pagination, no full rows. Used by "add all matching" bulk-select actions so the ' +
            'client can collect every matching id without downloading full project records.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: ProjectIdsDto })
    async findIds(
        @Param('network') network: string,
        @Query() query: ProjectQueryDto,
    ): Promise<ProjectIdsDto> {
        return this.projectsService.findIds(network, query);
    }

    @Post('batch')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Get several projects at once (e.g. a watchlist)',
        description:
            'Returns full project records for a given list of sourceTimestamp IDs (the ID form ' +
            'the watchlist stores) in the same shape as the list endpoint. Used so Portfolio can fetch ' +
            'exactly its watchlisted projects instead of the entire catalog. Requires authentication.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: [ProjectResponseDto] })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async findByIds(
        @Param('network') network: string,
        @Body() dto: BatchProjectsDto,
    ): Promise<ProjectResponseDto[]> {
        return this.projectsService.findByIds(network, dto.sourceTimestamps);
    }

    @Get(':id/activity')
    @ApiOperation({
        summary: 'See a project\'s activity history',
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

    @AdminWrite()
    @Post(':id/re-extract')
    @ApiOperation({
        summary: 'Rebuild one project from its stored documents',
        description:
            'Enqueues one PROJECT_REPARSE job per VC that was previously attached to this project ' +
            'via businessData->linkedVcs. Useful after a field-mapping update when only one project ' +
            'needs refreshing, and is faster than running the per-methodology reparse. ' +
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

    @AdminWrite()
    @Post(':id/refresh-ipfs')
    @ApiOperation({
        summary: 'Re-download and rebuild all of a project\'s documents',
        description:
            'Stronger sibling of /re-extract. Targets every VC in the project\'s ' +
            'relatedTopicId. It re-fetches IPFS for those whose documents are still null ' +
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
        summary: 'Get one of a project\'s original documents',
        description:
            'Returns the full JSONB VC document from the message table for the specified ' +
            'consensusTimestamp. The timestamp must appear in the project\'s businessData->linkedVcs ' +
            'list. This check prevents arbitrary message fetches via the project namespace. ' +
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

    @Get(':id/issuances/:mintTimestamp/serials')
    @ApiOperation({
        summary: 'List the credit serial numbers from one of a project\'s issuances',
        description:
            'Returns the serials produced by a single MintToken event as **contiguous ranges** rather ' +
            'than one entry per serial. A range is lossless (every serial\'s status is implied by the ' +
            'range containing it), and the volume difference is decisive: a 42,000-serial issuance is ' +
            'one range. Serials are attributed via Guardian\'s NFT-metadata convention: the mint ' +
            'VP-Document\'s consensus timestamp is base64-encoded into every NFT minted for that VP. ' +
            'Check mintMatchStatus before relying on it. Only "verified" means the serial count ' +
            'exactly matches the MintToken VC\'s amount. The mint must belong to the given project. ' +
            'Fungible mints return no ranges: fungible units are interchangeable and cannot be ' +
            'enumerated, so use the issuance event\'s mintedAmount instead. Pagination counts ranges.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiParam({
        name: 'mintTimestamp',
        description: 'HCS consensus timestamp of the MintToken VC (issuanceEvents[].mintConsensusTimestamp)',
    })
    @ApiResponse({ status: 200, type: MintSerialsResponseDto })
    @ApiResponse({ status: 404, description: 'Mint not found or not linked to this project' })
    async getMintSerials(
        @Param('network') network: string,
        @Param('id') id: string,
        @Param('mintTimestamp') mintTimestamp: string,
        @Query() query: PaginationQueryDto,
    ): Promise<MintSerialsResponseDto> {
        // No sort options: ranges are only meaningful in serial order.
        return this.projectsService.findMintSerials(
            network, id, mintTimestamp, query.page ?? 1, query.limit ?? 20,
        );
    }

    @Get(':id/transactions')
    @ApiOperation({
        summary: 'See all retirements and transfers for a project',
        description:
            "Same as the per-issuance endpoint, across every one of the project's issuances. Backs the " +
            'Credit Lifecycle view. Newest first. Only credits attributable to this project\'s mint ' +
            'events are included, so a token shared with another project does not leak its activity here.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiResponse({ status: 200, type: MintTransactionsResponseDto })
    @ApiResponse({ status: 404, description: 'Project has no linked issuances' })
    async getProjectTransactions(
        @Param('network') network: string,
        @Param('id') id: string,
        @Query() query: PaginationQueryDto,
    ): Promise<MintTransactionsResponseDto> {
        return this.projectsService.findMintTransactions(
            network, id, null, query.page ?? 1, query.limit ?? 20, query.sortBy, query.sortDir,
        );
    }

    @Get(':id/issuances/:mintTimestamp/transactions')
    @ApiOperation({
        summary: 'See retirements and transfers for one of a project\'s issuances',
        description:
            "Lists the on-chain transactions that affected the credits produced by a single mint event, " +
            'newest first. Retirements come from Guardian\'s retirement contract and name the retiring ' +
            'account and exact serials; transfers come from the Hedera CRYPTOTRANSFER itself, since ' +
            'Guardian writes no transfer document. Each row is one transaction, since a retirement or ' +
            'distribution typically moves many serials at once. Transfer coverage is the treasury hop ' +
            '(registry to first holder); onward trades between holders are not indexed.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiParam({ name: 'mintTimestamp', description: 'HCS consensus timestamp of the MintToken VC' })
    @ApiResponse({ status: 200, type: MintTransactionsResponseDto })
    @ApiResponse({ status: 404, description: 'Mint not found or not linked to this project' })
    async getMintTransactions(
        @Param('network') network: string,
        @Param('id') id: string,
        @Param('mintTimestamp') mintTimestamp: string,
        @Query() query: PaginationQueryDto,
    ): Promise<MintTransactionsResponseDto> {
        return this.projectsService.findMintTransactions(
            network, id, mintTimestamp, query.page ?? 1, query.limit ?? 20, query.sortBy, query.sortDir,
        );
    }

    @Get(':id/vc-evidence/:consensusTimestamp')
    @ApiOperation({
        summary: 'Get one project document with readable field names',
        description:
            'Returns the full JSONB VC document from the message table together with a ' +
            'fieldLabels map (credentialSubject key → human-readable label from the policy ' +
            'schemaFields).  The consensusTimestamp must appear in the project\'s ' +
            'businessData->linkedVcs list.  fieldLabels is an empty object when the policy ' +
            'schema cannot be resolved, so callers must fall back gracefully.',
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
        summary: 'Get the methodology workflow diagram for a project',
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
        summary: 'Get the full methodology definition behind a project',
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
        summary: 'Get a project\'s detailed information',
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

    @Get(':id/mrv-data/:schemaUuid')
    @ApiOperation({
        summary: 'Get a project\'s monitoring (MRV) data',
        description:
            'Real, server-paginated table over one externalDataBlock-bound (MRV) schema\'s VC records: ' +
            'supports column sorting, a time-range filter, and a device/measurement-point filter+drill-down. ' +
            'Unlike GET :id/additional-details (which decodes and returns every linked VC in one payload), ' +
            'this is designed to stay fast for MRV datasets with hundreds of thousands of records.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'HCS consensus timestamp (sourceTimestamp) or projectKey of the project' })
    @ApiParam({ name: 'schemaUuid', description: 'Bare schema UUID (from project.mrvSchemas[].schemaUuid)' })
    @ApiResponse({ status: 200, type: MrvDataResponseDto })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async getMrvData(
        @Param('network') network: string,
        @Param('id') id: string,
        @Param('schemaUuid') schemaUuid: string,
        @Query() query: MrvDataQueryDto,
    ): Promise<MrvDataResponseDto> {
        return this.projectsService.getMrvData(network, id, schemaUuid, query);
    }

    @Get(':id/export/:format')
    @ApiOperation({
        summary: 'Export a project in a standard format (IWA dMRV, CADTrust or CDOP)',
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
        summary: 'Get a single project',
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
