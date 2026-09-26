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
@ApiTags('My account')
@ApiCookieAuth()
@Controller('api/v1/me/rate-limit-requests')
@UseGuards(JwtAuthGuard)
export class RateLimitRequestController {
    constructor(private readonly service: RateLimitRequestService) {}

    @Get()
    @ApiOperation({
        summary: 'See my request limit and past requests',
        description:
            'Returns the caller\'s rate-limit request history together with their current hourly quota, the ' +
            'default quota for their role, the maximum that can be requested, and whether a request is pending.',
    })
    @ApiResponse({ status: 200, description: 'Requests history and quota summary' })
    async listOwn(@CurrentUser() user: AuthenticatedUser) {
        return this.service.listOwn(user);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Ask for a higher request limit',
        description:
            'Asks an administrator for a higher hourly API quota, with a justification. The requested quota ' +
            'cannot exceed the configured maximum, and only one request can be pending at a time. ' +
            'Administrators already have the admin quota and cannot submit requests. Returns the updated ' +
            'history and quota summary. Requires the `X-CSRF-Token` header.',
    })
    @ApiResponse({ status: 201, description: 'Updated requests + quota summary' })
    @ApiResponse({ status: 400, description: 'Requested quota exceeds the maximum' })
    @ApiResponse({ status: 403, description: 'Administrators cannot submit requests' })
    @ApiResponse({ status: 409, description: 'A pending request already exists' })
    async submit(
        @Body() dto: CreateRateLimitRequestDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.submit(user, dto);
    }
}
