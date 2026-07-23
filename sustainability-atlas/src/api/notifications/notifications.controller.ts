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

@ApiTags('notifications')
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
        summary: 'Server-Sent Events stream for real-time notification pushes',
        description:
            'Streams se:notifications pub/sub messages addressed to the current ' +
            'user, plus a heartbeat every 25s. Connect with EventSource on the ' +
            'client. The DB row is always the source of truth — a missed push ' +
            'is still visible on the next list/unread-count fetch.',
    })
    @ApiResponse({ status: 200, description: 'SSE stream established' })
    streamEvents(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
        return this.eventsBus.streamForUser(user.id);
    }

    @Get()
    @ApiOperation({ summary: 'List the current user\'s notifications for a network (keyset paginated)' })
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
    @ApiOperation({ summary: 'Get the current user\'s unread notification count for a network (cached 30s)' })
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
    @ApiOperation({ summary: 'Mark a single notification as read' })
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
    @ApiOperation({ summary: 'Mark all of the current user\'s unread notifications (for a network) as read' })
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
    @ApiOperation({ summary: 'Permanently delete all of the current user\'s notifications for a network' })
    async clearAll(
        @Query() query: NetworkQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const count = await this.service.clearAll(user.id, query.network);
        return { count };
    }
}
