import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RateLimitAdminService } from './rate-limit-admin.service';
import { ResolveRateLimitRequestDto } from './dto/resolve-rate-limit-request.dto';

/**
 * Admin review of rate-limit requests. Route: /api/v1/admin/rate-limit-requests.
 * Admin-only (JwtAuthGuard + RolesGuard + @Roles('admin')); CsrfGuard on PATCH.
 */
@ApiTags('Request limit reviews')
@ApiCookieAuth()
@Controller('api/v1/admin/rate-limit-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RateLimitAdminController {
    constructor(private readonly service: RateLimitAdminService) {}

    @Get()
    @ApiOperation({
        summary: 'List requests for higher limits',
        description:
            'Lists users\' rate-limit increase requests with the requester and their current quota. Filter with ' +
            '`status` = `pending`, `approved`, `adjusted` or `declined`.',
    })
    @ApiResponse({ status: 200, description: 'Requests with requester + current quota' })
    async list(@Query('status') status?: 'pending' | 'approved' | 'adjusted' | 'declined') {
        return this.service.list(status);
    }

    @Patch(':id')
    @UseGuards(CsrfGuard)
    @ApiOperation({
        summary: 'Approve, adjust or decline a limit request',
        description:
            'Resolves a pending request. `approved` grants the requested quota; `adjusted` grants `approvedQuota` ' +
            'instead, which may be lower than requested or even below the user\'s current quota; `declined` ' +
            'leaves the quota unchanged. Granted quotas are clamped to the configured maximum, and the optional ' +
            '`note` is shown to the requester. Administrators cannot resolve their own request.',
    })
    @ApiResponse({ status: 200, description: 'The resolved request' })
    @ApiResponse({ status: 400, description: '`approvedQuota` missing for an `adjusted` decision' })
    @ApiResponse({ status: 403, description: 'Cannot resolve your own request' })
    @ApiResponse({ status: 404, description: 'Request not found' })
    @ApiResponse({ status: 409, description: 'Request already resolved' })
    async resolve(
        @Param('id') id: string,
        @Body() dto: ResolveRateLimitRequestDto,
        @CurrentUser() actor: AuthenticatedUser,
    ) {
        return this.service.resolve(id, dto, actor);
    }
}
