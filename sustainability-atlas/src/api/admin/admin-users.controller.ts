import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AdminUsersService } from './admin-users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import {
    AdminListUsersQueryDto,
    UpdateUserStatusDto,
    UpdateUserRoleDto,
    SetUserQuotaDto,
} from './dto/admin-users.dto';

/**
 * Admin user-management endpoints.
 *
 * Route: /api/v1/admin/users (NO :network segment — identity is cross-network).
 *
 * Every route is admin-only: class-level @UseGuards(JwtAuthGuard, RolesGuard) +
 * @Roles('admin'). JwtAuthGuard resolves the live user (isActive + tokenVersion),
 * RolesGuard enforces the admin role from that resolved user. Mutating routes add
 * CsrfGuard (double-submit) since they are cookie-authenticated.
 */
@ApiTags('User management')
@ApiCookieAuth()
@Controller('api/v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
    constructor(private readonly adminUsers: AdminUsersService) {}

    @Get()
    @ApiOperation({
        summary: 'Search users',
        description:
            'Paginated user list for the admin panel, with free-text search and the filters described by the ' +
            'query parameters. Active/inactive counts are returned alongside the page. Password hashes and ' +
            'token versions are never included.',
    })
    @ApiResponse({ status: 200, description: 'Paginated users + active/inactive counts' })
    async list(@Query() query: AdminListUsersQueryDto) {
        return this.adminUsers.list(query);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add a user',
        description:
            'Creates an account directly, with role `system_user` or `admin`, instead of the user signing up ' +
            'themselves. Only safe fields are returned.',
    })
    @ApiResponse({ status: 201, description: 'Created user (safe fields)' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async create(
        @Body() dto: AdminCreateUserDto,
        @CurrentUser() actor: AuthenticatedUser,
    ) {
        return this.adminUsers.create(dto, actor);
    }

    @Patch(':id/status')
    @UseGuards(CsrfGuard)
    @ApiOperation({
        summary: 'Activate or deactivate a user',
        description:
            'Deactivation takes effect immediately: the user\'s refresh sessions are revoked and their next ' +
            'request is rejected. You cannot deactivate your own account or the last active administrator.',
    })
    @ApiResponse({ status: 200, description: 'Updated user' })
    @ApiResponse({ status: 403, description: 'Cannot deactivate your own account' })
    @ApiResponse({ status: 409, description: 'Cannot deactivate the last active admin' })
    async setStatus(
        @Param('id') id: string,
        @Body() dto: UpdateUserStatusDto,
        @CurrentUser() actor: AuthenticatedUser,
    ) {
        return this.adminUsers.setStatus(id, dto.isActive, actor);
    }

    @Patch(':id/role')
    @UseGuards(CsrfGuard)
    @ApiOperation({
        summary: 'Change a user\'s role',
        description:
            'Switches a user between `system_user` and `admin`. Takes effect immediately: outstanding access ' +
            'tokens are invalidated and sessions revoked, so the user signs in again under the new role. You ' +
            'cannot demote your own account or the last active administrator.',
    })
    @ApiResponse({ status: 200, description: 'Updated user' })
    @ApiResponse({ status: 403, description: 'Cannot demote your own account' })
    @ApiResponse({ status: 409, description: 'Cannot demote the last active admin' })
    async setRole(
        @Param('id') id: string,
        @Body() dto: UpdateUserRoleDto,
        @CurrentUser() actor: AuthenticatedUser,
    ) {
        return this.adminUsers.setRole(id, dto.role, actor);
    }

    @Patch(':id/quota')
    @UseGuards(CsrfGuard)
    @ApiOperation({
        summary: 'Change a user\'s hourly request limit',
        description:
            'Sets the user\'s hourly API request quota directly, overriding their role default. It can also ' +
            'lower it. The value is clamped to between 1 and the configured maximum (RATE_LIMIT_MAX_QUOTA), ' +
            'and a justification is required.',
    })
    @ApiResponse({ status: 200, description: 'Updated user' })
    @ApiResponse({ status: 400, description: 'Validation error (quota / justification)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async setQuota(
        @Param('id') id: string,
        @Body() dto: SetUserQuotaDto,
        @CurrentUser() actor: AuthenticatedUser,
    ) {
        return this.adminUsers.setQuota(id, dto.quota, dto.justification, actor);
    }
}
