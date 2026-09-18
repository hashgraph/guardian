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

@ApiTags('My account')
@ApiCookieAuth()
@Controller('api/v1/me/quick-filters')
@UseGuards(JwtAuthGuard)
export class QuickFiltersController {
    constructor(private readonly service: QuickFiltersService) {}

    @Get()
    @ApiOperation({
        summary: 'List my saved searches',
        description:
            'Returns the caller\'s saved searches for one network and table section (`projects`, ' +
            '`methodologies` or `issuances`), together with the per-section limit.',
    })
    async list(
        @Query() query: ListQuickFiltersQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.list(user.id, query.network, query.section);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Save a search',
        description:
            'Saves filter criteria under a name (up to 30 characters) for one network and section. Returns 422 ' +
            'when no filters are active, and 409 when the name is already taken or the per-section limit ' +
            '(default 10) is reached. Requires the `X-CSRF-Token` header.',
    })
    async create(
        @Body() dto: CreateQuickFilterDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.create(user.id, dto.network, dto.section, dto.name, dto.criteria);
    }

    @Delete(':id')
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete a saved search',
        description:
            'Deletes one of the caller\'s saved searches. Returns 404 when it does not exist or belongs to ' +
            'another user. Requires the `X-CSRF-Token` header.',
    })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        await this.service.remove(id, user.id);
    }
}
