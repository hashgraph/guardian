import {
    Controller, Get, Put, Body, Query,
    UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DashboardPreferencesService } from './dashboard-preferences.service';
import { GetDashboardQueryDto } from './dto/get-dashboard-query.dto';
import { SaveDashboardDto } from './dto/save-dashboard.dto';

@ApiTags('My account')
@ApiCookieAuth()
@Controller('api/v1/me/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardPreferencesController {
    constructor(private readonly service: DashboardPreferencesService) {}

    @Get()
    @ApiOperation({
        summary: 'Get my saved Portfolio layout',
        description:
            'Returns every Portfolio preference the caller has saved for the network: watchlist, widgets, ' +
            'custom charts and watchlist filters.',
    })
    async get(
        @Query() query: GetDashboardQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.get(user.id, query.network);
    }

    @Put()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Save my Portfolio layout',
        description:
            'Creates or replaces one preference type (`watchlist`, `widgets`, `custom_charts` or ' +
            '`watchlist_filters`) for the network. The saved layout for that type is overwritten as a whole; ' +
            'other types are untouched. Requires the `X-CSRF-Token` header.',
    })
    async save(
        @Body() dto: SaveDashboardDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.saveType(user.id, dto.network, dto.type, dto.layout);
    }
}
