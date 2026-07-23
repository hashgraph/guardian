import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

/**
 * Authenticated user self-service endpoints (any signed-in user — system_user or
 * admin). Route: /api/v1/me/* (NO :network segment — these are cross-network).
 *
 * Protected with method/class-level @UseGuards(JwtAuthGuard) — NOT @Roles, so any
 * authenticated user qualifies. CsrfGuard on mutating routes. All key operations
 * are scoped to req.user.id inside the service (ownership in the SQL WHERE).
 */
@ApiTags('account')
@ApiCookieAuth()
@Controller('api/v1/me/api-keys')
@UseGuards(JwtAuthGuard)
export class AccountController {
    constructor(private readonly apiKeys: ApiKeyService) {}

    @Get()
    @ApiOperation({ summary: 'List my API keys (secrets are never returned)' })
    @ApiResponse({ status: 200, description: 'The caller\'s API keys' })
    async list(@CurrentUser() user: AuthenticatedUser) {
        return this.apiKeys.list(user.id);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Generate a new API key (full key shown ONCE)' })
    @ApiResponse({ status: 201, description: 'The created key including the one-time secret' })
    @ApiResponse({ status: 409, description: 'Active key limit reached — revoke one first' })
    async create(
        @Body() dto: CreateApiKeyDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.apiKeys.create(user.id, dto.name.trim());
    }

    @Delete(':id')
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke one of my API keys' })
    @ApiResponse({ status: 204, description: 'Revoked' })
    @ApiResponse({ status: 404, description: 'Key not found (or not owned by caller)' })
    async revoke(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        await this.apiKeys.revoke(user.id, id);
    }
}
