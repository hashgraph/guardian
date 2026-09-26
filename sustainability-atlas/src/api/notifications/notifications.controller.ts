import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Param,
    Query,
    Sse,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { NotificationEventsBus } from './notification-events-bus.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NetworkQueryDto } from './dto/network-query.dto';

@ApiTags('Notifications')
@ApiCookieAuth()
@Controller('api/v1/me/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(
        private readonly service: NotificationsService,
        private readonly eventsBus: NotificationEventsBus,
    ) {}

    // -------------------------------------------------------------------------
    // SSE — MUST be declared first to avoid ':id' wildcard route capture,
    // same reasoning documented on QueueStatusController's SSE route.
    // -------------------------------------------------------------------------

    @Sse('events')
    @ApiOperation({
        summary: 'Receive my notifications live',
        description:
            'Streams se:notifications pub/sub messages addressed to the current ' +
            'user, plus a heartbeat every 25s. Connect with EventSource on the ' +
            'client. The DB row is always the source of truth, so a missed push ' +
            'is still visible on the next list/unread-count fetch.',
    })
    @ApiResponse({ status: 200, description: 'SSE stream established' })
    streamEvents(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
        return this.eventsBus.streamForUser(user.id);
    }

    @Get()
    @ApiOperation({
        summary: 'List my notifications',
        description:
            'Returns the caller\'s notifications for one network. Pagination is keyset-based: pass the `cursor` ' +
            'from the previous response to fetch the next page (`limit` defaults to 20, max 100). Set ' +
            '`unreadOnly=true` to return unread notifications only.',
    })
    async list(
        @Query() query: ListNotificationsQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.list(user.id, query.network, {
            cursor: query.cursor,
            limit: query.limit ?? 20,
            unreadOnly: query.unreadOnly ?? false,
        });
    }

    @Get('unread-count')
    @ApiOperation({
        summary: 'Count my unread notifications',
        description: 'Returns `{ count }`, the number of unread notifications the caller has on the network. Cached for 30 seconds.',
    })
    async unreadCount(
        @Query() query: NetworkQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const count = await this.service.unreadCount(user.id, query.network);
        return { count };
    }

    @Patch(':id/read')
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Mark a notification as read',
        description:
            'Marks one of the caller\'s notifications on the network as read and returns `{ updated }`. ' +
            'Requires the `X-CSRF-Token` header.',
    })
    @ApiParam({ name: 'id', description: 'Notification UUID' })
    async markRead(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: NetworkQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const updated = await this.service.markRead(user.id, query.network, id);
        return { updated };
    }

    @Post('read-all')
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Mark all my notifications as read',
        description:
            'Marks every unread notification the caller has on the network as read and returns how many ' +
            'changed as `{ count }`. Requires the `X-CSRF-Token` header.',
    })
    async markAllRead(
        @Query() query: NetworkQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const count = await this.service.markAllRead(user.id, query.network);
        return { count };
    }

    @Delete()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete all my notifications',
        description:
            'Deletes all of the caller\'s notifications on the network (read and unread) and returns how many ' +
            'were removed as `{ count }`. Cannot be undone. Requires the `X-CSRF-Token` header.',
    })
    async clearAll(
        @Query() query: NetworkQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const count = await this.service.clearAll(user.id, query.network);
        return { count };
    }
}
