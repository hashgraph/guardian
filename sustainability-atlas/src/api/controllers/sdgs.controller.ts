import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SdgsService } from '../services/sdgs.service';
import { SdgStatsListResponseDto } from '../dto/sdg.dto';

@ApiTags('sdgs')
@Controller('api/v1/:network/sdgs')
export class SdgsController {
    constructor(private readonly sdgsService: SdgsService) {}

    @Get()
    @ApiOperation({
        summary: 'List Sustainable Development Goals with project aggregates',
        description:
            'Returns one entry per SDG (1–17) with the number of projects tagged ' +
            'with that SDG, total credits, distinct developers and countries, and ' +
            'the top methodology by project count. Also returns the total project ' +
            'count for the network so the frontend can compute SDG coverage.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({ status: 200, type: SdgStatsListResponseDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(@Param('network') network: string): Promise<SdgStatsListResponseDto> {
        return this.sdgsService.findAll(network);
    }
}
