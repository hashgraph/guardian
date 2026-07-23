import { BadRequestException, Controller, Get, Param, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiProduces, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ImpactSummaryService } from '../services/impact-summary.service';
import { ImpactSummaryResponseDto } from '../dto/impact-summary.dto';
import { ImpactSummaryReportScope } from '../services/impact-summary/pdf-template';
import { EXPORT_FORMATS, ExportFormat } from '../dto/export.dto';

/** Impact Summary combined aggregate: total credits, retirements (inferred), active projects/countries, SDG contributions, geographic distribution, sector breakdown, registry breakdown, and methodology count for one network in a single JSON round trip. */
@ApiTags('impact-summary')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/:network/impact-summary')
export class ImpactSummaryController {
    constructor(private readonly impactSummaryService: ImpactSummaryService) {}

    @Get()
    @ApiOperation({
        summary: 'Combined Impact Summary aggregate',
        description:
            'Returns one combined aggregate payload: total credits issued, retirements (inferred from ' +
            'Mirror-Node-deleted NFT serials — not a ledger), active projects/countries, SDG contributions, ' +
            'geographic distribution, sector breakdown (with explicit Unknown/Others buckets), registry ' +
            'breakdown, and methodology count (deduped by relatedTopicId). Backs the Reports page ' +
            '"Impact Summary" tab and the one-click Export Impact Summary generator.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiResponse({ status: 200, type: ImpactSummaryResponseDto })
    @ApiResponse({ status: 401, description: 'Authentication required' })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async getSummary(@Param('network') network: string): Promise<ImpactSummaryResponseDto> {
        return this.impactSummaryService.getSummary(network);
    }

    @Get('export')
    @ApiOperation({
        summary: 'Generate and download the Impact Summary document (CSV/XLSX/PDF)',
        description:
            'Streams a freshly generated Impact Summary document. PDF is the curated top-N report; ' +
            'CSV/XLSX carry the FULL underlying ' +
            'breakdown datasets (geographic distribution, sector breakdown, registry breakdown, SDG ' +
            'contributions) rather than a top-N subset. `registryLabel`/`periodLabel` are display-only ' +
            'scope labels for the report title — the aggregate itself is not filtered by them. ' +
            'Best-effort audit-logs the generation to `audit_log` (`action=\'export.impact_summary\'`); ' +
            'the file itself is not persisted server-side.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiQuery({ name: 'format', enum: EXPORT_FORMATS, description: 'Output file format' })
    @ApiQuery({ name: 'registryLabel', required: false, description: 'Display-only registry scope label for the report title' })
    @ApiQuery({ name: 'periodLabel', required: false, description: 'Display-only reporting period label for the report title' })
    @ApiProduces(
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiResponse({ status: 200, description: 'The generated Impact Summary document' })
    @ApiResponse({ status: 400, description: 'Missing or invalid format' })
    @ApiResponse({ status: 401, description: 'Authentication required' })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async exportSummary(
        @Param('network') network: string,
        @Query('format') format: string,
        @Query('registryLabel') registryLabel: string | undefined,
        @Query('periodLabel') periodLabel: string | undefined,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<StreamableFile> {
        const resolvedFormat = this.resolveFormat(format);
        const scope: ImpactSummaryReportScope | undefined =
            registryLabel || periodLabel ? { registryLabel, periodLabel } : undefined;

        const result = await this.impactSummaryService.generateDocument(network, resolvedFormat, scope, user);
        return new StreamableFile(result.content, {
            type: result.mime,
            disposition: `attachment; filename="${result.filename}"`,
            length: result.content.length,
        });
    }

    /** Path-param-style validation only (no business logic) — keeps the controller thin, mirrors `ExportsController.resolveDataset()`. */
    private resolveFormat(format: string): ExportFormat {
        if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
            throw new BadRequestException(
                `Unknown export format "${format}". Expected one of: ${EXPORT_FORMATS.join(', ')}`,
            );
        }
        return format as ExportFormat;
    }
}
