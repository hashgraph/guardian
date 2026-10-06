import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import {
    GuardianSyncService,
    GuardianSyncStatusDto,
    GuardianSyncEventPageDto,
} from '../services/guardian-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Operational telemetry — admin-only (the spec scopes "Guardian Sync data" /
// "manage sync status" to administrators). Whole controller is admin-gated.
@ApiTags('Guardian live sync')
@ApiCookieAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class GuardianSyncController {
    constructor(private readonly guardianSync: GuardianSyncService) {}

    @Get(':network/guardian-sync/status')
    @ApiOperation({
        summary: 'Check the Guardian live-sync service',
        description:
            'Reads the heartbeat the optional guardian-sync process publishes for this network: whether it is ' +
            'running (`enabled`), whether it holds leadership, when it last reported, and each instance\'s ' +
            'connection state and last event subject. `enabled` is false when no guardian-sync process is running.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiOkResponse({
        description:
            'Live status of the opt-in guardian-sync subscriber for this network ' +
            '(enabled=false when no guardian-sync process is running).',
    })
    getStatus(@Param('network') network: string): Promise<GuardianSyncStatusDto> {
        return this.guardianSync.getStatus(network);
    }

    @Get(':network/guardian-sync/events')
    @ApiOperation({
        summary: 'See events received from Guardian',
        description:
            'Events guardian-sync received and what each one triggered, newest first, paginated with `page` and ' +
            '`pageSize`. `subject` is a case-insensitive contains-filter (e.g. `block_complete` matches ' +
            '`external-events.block_complete`). Returns an empty page when guardian-sync has never run on this network.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'pageSize', required: false, type: Number })
    @ApiQuery({ name: 'subject', required: false, type: String })
    @ApiOkResponse({
        description: 'Paginated audit of events guardian-sync received and what it triggered.',
    })
    getEvents(
        @Param('network') network: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('subject') subject?: string,
    ): Promise<GuardianSyncEventPageDto> {
        return this.guardianSync.getEvents(network, {
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
            subject,
        });
    }
}
