import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortfolioStatsService } from '../services/portfolio-stats.service';
import { ActivityService } from '../services/activity.service';
import { PortfolioStatsRequestDto, PortfolioStatsDto } from '../dto/portfolio.dto';
import { NetworkActivityRequestDto, NetworkActivityItemDto } from '../dto/activity.dto';

@ApiTags('portfolio')
@ApiCookieAuth()
@Controller('api/v1/:network/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
    constructor(
        private readonly service: PortfolioStatsService,
        private readonly activityService: ActivityService,
    ) {}

    @Post('stats')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Aggregated credit stats for a set of watchlisted projects',
        description:
            'Returns total minted, per-project totals, a monthly issuance series, and recent ' +
            'issuances for the given project keys — computed in Postgres instead of shipping raw ' +
            'credit rows to the client. Requires authentication; results are cached per-user for 60s.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: PortfolioStatsDto })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async getStats(
        @Param('network') network: string,
        @Body() dto: PortfolioStatsRequestDto,
        @CurrentUser('id') userId: string,
    ): Promise<PortfolioStatsDto> {
        return this.service.getStats(userId, network, dto.projectKeys);
    }

    @Post('network-activity')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Latest 10 network events touching the watchlist, newest first',
        description:
            'Same event taxonomy as the Dashboard feed, scoped entirely to the given project ' +
            'keys: Project Registered and Credit Minted match directly; Methodology/Registry ' +
            'Registered are resolved via the watchlisted projects\' own instance topic / ' +
            'registry DID; Credit Retired is resolved via the retired token\'s mint history ' +
            '(no dedicated retirement linker exists yet, so this is an approximation). The ' +
            '"other" bucket (token creation, identity, verification, role grants) has no ' +
            'reliable per-project attribution and is dropped entirely rather than guessed. An ' +
            'empty projectKeys array returns an empty feed. Results are cached for 10 seconds.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiResponse({ status: 200, type: [NetworkActivityItemDto] })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async getNetworkActivity(
        @Param('network') network: string,
        @Body() dto: NetworkActivityRequestDto,
    ): Promise<NetworkActivityItemDto[]> {
        if (dto.projectKeys.length === 0) return [];
        return this.activityService.getNetworkActivity(network, { projectKeys: dto.projectKeys });
    }
}
