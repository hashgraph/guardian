import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import {
    DashboardMintStatsQueryDto,
    DashboardMintStatsDto,
    DashboardSummaryDto,
} from '../dto/dashboard.dto';

@ApiTags('dashboard')
@Controller('api/v1/:network/dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('mint-stats')
    @ApiOperation({
        summary: 'Dashboard mint statistics',
        description:
            'Returns total minted amount, monthly issuance series, and sector/registry breakdowns ' +
            'sourced from project_mint_link — actual on-chain MintToken amounts connected to projects. ' +
            'Results are cached for 60 seconds.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: DashboardMintStatsDto })
    async getMintStats(
        @Param('network') network: string,
        @Query() query: DashboardMintStatsQueryDto,
    ): Promise<DashboardMintStatsDto> {
        return this.dashboardService.getMintStats(network, {
            registry: query.registry,
            developer: query.developer,
            registryDid: query.registryDid,
        });
    }

    @Get('summary')
    @ApiOperation({
        summary: 'Dashboard project aggregates',
        description:
            'Returns registry/methodology/project totals plus per-country, per-registry, ' +
            'per-sector and per-vintage project breakdowns and map markers, aggregated in ' +
            'Postgres. Replaces fetching the entire project catalogue client-side. ' +
            'Results are cached for 60 seconds.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: DashboardSummaryDto })
    async getSummary(
        @Param('network') network: string,
        @Query() query: DashboardMintStatsQueryDto,
    ): Promise<DashboardSummaryDto> {
        return this.dashboardService.getSummary(network, {
            registry: query.registry,
            developer: query.developer,
            registryDid: query.registryDid,
        });
    }
}
