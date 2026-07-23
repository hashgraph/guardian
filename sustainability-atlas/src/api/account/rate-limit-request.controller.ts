import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RateLimitRequestService } from './rate-limit-request.service';
import { CreateRateLimitRequestDto } from './dto/create-rate-limit-request.dto';

/**
 * User self-service rate-limit requests. Route: /api/v1/me/rate-limit-requests.
 * Any authenticated user; CsrfGuard on the mutating POST.
 */
@ApiTags('account')
@ApiCookieAuth()
@Controller('api/v1/me/rate-limit-requests')
@UseGuards(JwtAuthGuard)
export class RateLimitRequestController {
    constructor(private readonly service: RateLimitRequestService) {}

    @Get()
    @ApiOperation({ summary: 'My rate-limit requests + current/effective quota' })
    @ApiResponse({ status: 200, description: 'Requests history and quota summary' })
    async listOwn(@CurrentUser() user: AuthenticatedUser) {
        return this.service.listOwn(user);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Request an API rate-limit increase' })
    @ApiResponse({ status: 201, description: 'Updated requests + quota summary' })
    @ApiResponse({ status: 409, description: 'A pending request already exists' })
    async submit(
        @Body() dto: CreateRateLimitRequestDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.submit(user, dto);
    }
}
