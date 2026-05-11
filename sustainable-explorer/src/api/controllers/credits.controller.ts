import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreditsService } from '../services/credits.service';
import { CreditQueryDto, PaginatedCreditsDto } from '../dto/credit.dto';

@ApiTags('credits')
@Controller('api/v1/:network/credits')
export class CreditsController {
    constructor(private readonly creditsService: CreditsService) {}

    @Get()
    @ApiOperation({
        summary: 'List Credits',
        description:
            'Returns a paginated list of carbon credit tokens for the specified network. ' +
            'Supports full-text search, filtering by type/registry/tokenId, and sorting.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({ status: 200, type: PaginatedCreditsDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(
        @Param('network') network: string,
        @Query() query: CreditQueryDto,
    ) {
        return this.creditsService.findAll(network, query);
    }

    @Get(':tokenId/raw')
    @ApiOperation({
        summary: 'Get raw underlying data for one credit',
        description:
            'Returns the underlying HCS messages for a credit: the original Token-issue ' +
            'message and any MintToken VC documents minted against the tokenId. ' +
            'Drives the "Raw Data" viewer on the credits page.',
    })
    @ApiParam({ name: 'tokenId', description: 'Hedera token ID, e.g. 0.0.4606399' })
    @ApiResponse({ status: 200, description: 'Raw credit detail' })
    @ApiResponse({ status: 404, description: 'Token not found' })
    async findRaw(
        @Param('network') network: string,
        @Param('tokenId') tokenId: string,
    ) {
        const detail = await this.creditsService.findRaw(network, tokenId);
        if (!detail) {
            throw new NotFoundException(`Credit ${tokenId} not found on ${network}`);
        }
        return detail;
    }
}
