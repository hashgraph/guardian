import { Controller, Get, Post, Patch, Param, Query, Body, StreamableFile, NotFoundException } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
    ApiProduces,
} from '@nestjs/swagger';
import { MethodologiesService } from '../services/methodologies.service';
import { MappingReprocessService } from '../services/mapping-reprocess.service';
import {
    MethodologyQueryDto,
    MethodologyResponseDto,
    PaginatedMethodologiesDto,
} from '../dto/methodology.dto';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { UpdateMappingDto } from '../dto/update-mapping.dto';
import { AdminWrite } from '../auth/decorators/admin-write.decorator';

@ApiTags('methodologies')
@Controller('api/v1/:network/methodologies')
export class MethodologiesController {
    constructor(
        private readonly methodologiesService: MethodologiesService,
        private readonly mappingReprocessService: MappingReprocessService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'List Methodologies',
        description:
            'Returns a paginated list of Methodologies (policies) for the specified network. ' +
            'Supports full-text search, filtering, sorting, and aggregated stats.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({ status: 200, type: PaginatedMethodologiesDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(
        @Param('network') network: string,
        @Query() query: MethodologyQueryDto,
    ) {
        return this.methodologiesService.findAll(network, query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get a Methodology by topic ID',
        description:
            'Returns a single Methodology matching the given Hedera policy topic ID on the specified network.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'id', description: 'Hedera policy topic ID of the methodology' })
    @ApiResponse({ status: 200, type: MethodologyResponseDto })
    @ApiResponse({ status: 404, description: 'Methodology not found' })
    async findById(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<MethodologyResponseDto> {
        const methodology = await this.methodologiesService.findById(network, id);
        if (!methodology) {
            throw new NotFoundException(`Methodology with ID "${id}" not found on ${network}`);
        }
        return methodology;
    }

    @Get(':id/decoded')
    @ApiOperation({
        summary: 'Get decode status and schema field mappings for a Methodology',
        description:
            'Returns the worker decode status for the given methodology and, if a project schema ' +
            'has been confirmed, which schema field key was resolved for each project property ' +
            '(title, country, sector, etc.). The frontend uses this to explain why certain ' +
            'project properties are missing.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'id', description: 'Hedera policy topic ID of the methodology' })
    @ApiResponse({ status: 200, type: DecodedMethodologyResponseDto })
    @ApiResponse({ status: 404, description: 'Methodology not found' })
    async findDecoded(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<DecodedMethodologyResponseDto> {
        const result = await this.methodologiesService.findDecoded(network, id);
        if (!result) {
            throw new NotFoundException(`Methodology with ID "${id}" not found on ${network}`);
        }
        return result;
    }

    @Get(':id/policy-package')
    @ApiOperation({
        summary: 'Download the methodology\'s policy ZIP package',
        description:
            'Streams the policy ZIP (the methodology definition package) from the indexer\'s ' +
            'cached IPFS content (ipfs_files), resolved via the policy\'s sourceCid. ' +
            'Available once the policy has been decoded; returns 404 when the ZIP has not ' +
            'been cached yet.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'id', description: 'Hedera policy topic ID of the methodology' })
    @ApiProduces('application/zip')
    @ApiResponse({ status: 200, description: 'The policy ZIP file' })
    @ApiResponse({ status: 404, description: 'Policy package not cached for this methodology' })
    async downloadPolicyPackage(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<StreamableFile> {
        const pkg = await this.methodologiesService.getPolicyPackage(network, id);
        if (!pkg) {
            throw new NotFoundException(`No cached policy package for methodology "${id}" on ${network}`);
        }
        return new StreamableFile(pkg.content, {
            type: 'application/zip',
            disposition: `attachment; filename="policy-${id}.zip"`,
            length: pkg.content.length,
        });
    }

    @AdminWrite()
    @Post(':id/redecode')
    @ApiOperation({
        summary: 'Re-run the policy decoder for an existing methodology',
        description:
            'Enqueues a fresh POLICY_DECODE job for the methodology\'s policy ZIP so that ' +
            'improvements to CrossSchemaFuzzyMapperService or MappingPipelineService are picked up ' +
            'without waiting for the normal re-sync cycle. ' +
            'The processor is idempotent: it upserts decode columns and overwrites any stale mapping. ' +
            'Returns immediately — check GET /:id/decoded for the updated status after the job completes.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'id', description: 'Hedera policy topic ID of the methodology' })
    @ApiResponse({
        status: 201,
        description: 'Job enqueued',
        schema: {
            type: 'object',
            properties: {
                enqueued: { type: 'boolean' },
                jobId: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Methodology or decode status row not found' })
    async redecode(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<{ enqueued: boolean; jobId?: string }> {
        return this.mappingReprocessService.redecodePolicy(network, id);
    }

    @AdminWrite()
    @Post('redecode-all')
    @ApiOperation({
        summary: 'Re-decode every decoded policy to re-stamp docType from updated classifier',
        description:
            'Enqueues a POLICY_DECODE job for every policy with decodeStatus="decoded". ' +
            'Use this after updating the document-type classifier to apply new keyword ' +
            'rules to existing policyMapping entries. Follow with POST reparse-projects ' +
            'to update project records with the corrected docType values. ' +
            'Returns immediately — jobs are processed asynchronously by the worker.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiResponse({
        status: 201,
        description: 'Re-decode jobs enqueued',
        schema: {
            type: 'object',
            properties: {
                total: { type: 'number', description: 'Policies found' },
                enqueued: { type: 'number', description: 'Jobs enqueued' },
                skipped: { type: 'number', description: 'Policies skipped due to error' },
            },
        },
    })
    async redecodeAll(
        @Param('network') network: string,
    ): Promise<{ total: number; enqueued: number; skipped: number }> {
        return this.mappingReprocessService.redecodeAllPolicies(network);
    }

    @AdminWrite()
    @Post('reparse-projects')
    @ApiOperation({
        summary: 'Re-parse projects across every methodology in the network',
        description:
            'Iterates over every methodology in the network and enqueues per-VC ' +
            'PROJECT_REPARSE jobs for those whose decode status is "success". ' +
            'Methodologies without a successful decode are skipped silently. ' +
            'Returns aggregate counts; jobs are processed asynchronously by the worker.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({
        status: 201,
        description: 'Reparse triggered',
        schema: {
            type: 'object',
            properties: {
                methodologies: { type: 'number', description: 'Methodologies inspected' },
                succeeded: { type: 'number', description: 'Methodologies that produced reparse jobs' },
                skipped: { type: 'number', description: 'Methodologies skipped (decode not success or error)' },
                enqueued: { type: 'number', description: 'Total VC reparse jobs enqueued' },
            },
        },
    })
    async reparseProjectsAll(
        @Param('network') network: string,
    ): Promise<{ methodologies: number; succeeded: number; skipped: number; enqueued: number }> {
        return this.mappingReprocessService.reparseAllProjects(network);
    }

    @AdminWrite()
    @Post(':id/reparse-projects')
    @ApiOperation({
        summary: 'Re-parse already-downloaded VCs to populate projects with updated field mapping',
        description:
            'Enqueues one PROJECT_REPARSE job per VC-Document that already has its IPFS content ' +
            'cached in the DB (documents IS NOT NULL). Useful after updating the field map via ' +
            'PATCH /:id/decoded or after a re-decode. ' +
            'Silently returns { enqueued: 0 } when the policy decode status is not "success". ' +
            'Returns immediately — jobs are processed asynchronously by the worker.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'id', description: 'Hedera policy topic ID of the methodology' })
    @ApiResponse({
        status: 201,
        description: 'Jobs enqueued',
        schema: {
            type: 'object',
            properties: {
                enqueued: { type: 'number', description: 'Number of reparse jobs enqueued' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Methodology not found' })
    async reparseProjects(
        @Param('network') network: string,
        @Param('id') id: string,
    ): Promise<{ enqueued: number }> {
        return this.mappingReprocessService.reparseProjects(network, id);
    }

    @AdminWrite()
    @Patch(':id/decoded')
    @ApiOperation({
        summary: 'Manually edit and save the field mapping for a methodology',
        description:
            'Applies a partial or full update to the cross-schema field map stored on ' +
            'policy."policyMapping". Only the keys present in the request body are ' +
            'overwritten (PATCH semantics). Re-derives projectFieldMap, projectGeoKey, ' +
            'projectGeoSection, and projectSchemaId from the merged map. ' +
            'Does NOT automatically trigger project re-parsing — call POST /:id/reparse-projects ' +
            'separately when ready. Returns the updated DecodedMethodologyResponseDto.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'id', description: 'Hedera policy topic ID of the methodology' })
    @ApiBody({ type: UpdateMappingDto })
    @ApiResponse({ status: 200, type: DecodedMethodologyResponseDto })
    @ApiResponse({
        status: 400,
        description:
            'Validation failure — unknown field labels, malformed schemaId.path values, ' +
            'or schemaIds that do not belong to this policy.',
    })
    @ApiResponse({ status: 404, description: 'Methodology or decode status row not found' })
    async updateMapping(
        @Param('network') network: string,
        @Param('id') id: string,
        @Body() body: UpdateMappingDto,
    ): Promise<DecodedMethodologyResponseDto> {
        return this.mappingReprocessService.updateMapping(network, id, body);
    }
}
