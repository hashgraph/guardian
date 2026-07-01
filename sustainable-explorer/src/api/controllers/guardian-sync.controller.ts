import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags, ApiCookieAuth } from '@nestjs/swagger';
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
@ApiTags('guardian-sync')
@ApiCookieAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class GuardianSyncController {
    constructor(private readonly guardianSync: GuardianSyncService) {}

    @Get(':network/guardian-sync/status')
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
