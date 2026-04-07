import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MethodologiesService } from '../services/methodologies.service';
import {
    MethodologyQueryDto,
    MethodologyResponseDto,
    PaginatedMethodologiesDto,
} from '../dto/methodology.dto';

@ApiTags('methodologies')
@Controller('api/v1/:network/methodologies')
export class MethodologiesController {
    constructor(private readonly methodologiesService: MethodologiesService) {}

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
}
