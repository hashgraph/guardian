import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortfolioStatsService } from '../services/portfolio-stats.service';
import { PortfolioStatsRequestDto, PortfolioStatsDto } from '../dto/portfolio.dto';

@ApiTags('portfolio')
@ApiCookieAuth()
@Controller('api/v1/:network/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
    constructor(private readonly service: PortfolioStatsService) {}

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
}
