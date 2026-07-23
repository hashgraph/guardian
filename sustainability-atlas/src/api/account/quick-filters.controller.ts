import {
    Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { QuickFiltersService } from './quick-filters.service';
import { ListQuickFiltersQueryDto } from './dto/list-quick-filters-query.dto';
import { CreateQuickFilterDto } from './dto/create-quick-filter.dto';

@ApiTags('account')
@ApiCookieAuth()
@Controller('api/v1/me/quick-filters')
@UseGuards(JwtAuthGuard)
export class QuickFiltersController {
    constructor(private readonly service: QuickFiltersService) {}

    @Get()
    @ApiOperation({ summary: 'List saved searches for a network + table section' })
    async list(
        @Query() query: ListQuickFiltersQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.list(user.id, query.network, query.section);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Save the current filter combination as a named search' })
    async create(
        @Body() dto: CreateQuickFilterDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.create(user.id, dto.network, dto.section, dto.name, dto.criteria);
    }

    @Delete(':id')
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a saved search' })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        await this.service.remove(id, user.id);
    }
}
