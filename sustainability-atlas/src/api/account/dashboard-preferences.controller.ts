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

@ApiTags('account')
@ApiCookieAuth()
@Controller('api/v1/me/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardPreferencesController {
    constructor(private readonly service: DashboardPreferencesService) {}

    @Get()
    @ApiOperation({ summary: 'Get all saved dashboard preferences for a network' })
    async get(
        @Query() query: GetDashboardQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.get(user.id, query.network);
    }

    @Put()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Upsert one dashboard preference type for a network' })
    async save(
        @Body() dto: SaveDashboardDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.saveType(user.id, dto.network, dto.type, dto.layout);
    }
}
