import { Controller, Get, Param, Query, Res, StreamableFile, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiProduces, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ExportsService } from '../services/exports.service';
import { ExportDataset } from '@shared/config/export-field-catalog';
import {
    ExportQueryDto,
    ExportHistoryQueryDto,
    PaginatedExportHistoryDto,
    EXPORT_DATASETS,
} from '../dto/export.dto';

/** Express res.setHeader structural shape — same minimal-interface pattern as AuthController's MinimalResponse, avoiding a direct `express` import for one method. */
interface MinimalResponse {
    setHeader(name: string, value: string): unknown;
}

/** ESG/compliance dataset export engine; generated files are streamed and never persisted server-side, with each generation best-effort audit-logged to `audit_log`. */
@ApiTags('exports')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/:network/exports')
export class ExportsController {
    constructor(private readonly exportsService: ExportsService) {}

    @Get()
    @ApiOperation({
        summary: 'List Recent Exports',
        description:
            'Returns a paginated, read-only audit trail of dataset/report exports on this network, ' +
            'newest first (backed by `audit_log`, not a stored-file table). Admins see every ' +
            "user's exports; regular users see only their own. Backs the Reports page \"Recent " +
            'Exports" table and stat cards.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiResponse({ status: 200, type: PaginatedExportHistoryDto })
    @ApiResponse({ status: 401, description: 'Authentication required' })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(
        @Param('network') network: string,
        @Query() query: ExportHistoryQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<PaginatedExportHistoryDto> {
        return this.exportsService.listExports(
            network,
            { id: user.id, isAdmin: user.role === 'admin' },
            query,
        );
    }

    @Get(':dataset')
    @ApiOperation({
        summary: 'Download a filtered dataset export (CSV/XLSX/PDF)',
        description:
            'Streams a freshly generated export file for the given dataset, scoped by the same ' +
            'filters as the corresponding list endpoint, in the requested format with the selected ' +
            'export-field-catalog columns. Capped at 1,000 rows per file — the `X-Total-Matching` ' +
            'response header carries the true match count so callers can detect truncation; use the ' +
            'public API with an API key to fetch the complete dataset beyond the first 1,000. ' +
            'Best-effort audit-logs the generation on every call; the file itself is not persisted.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'dataset', enum: EXPORT_DATASETS as unknown as string[], description: 'Dataset to export' })
    @ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf')
    @ApiResponse({ status: 200, description: 'The generated export file' })
    @ApiResponse({ status: 400, description: 'Unknown dataset, missing/invalid format, or unknown field key(s)' })
    @ApiResponse({ status: 401, description: 'Authentication required' })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async download(
        @Param('network') network: string,
        @Param('dataset') dataset: string,
        @Query() query: ExportQueryDto,
        @CurrentUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) res: MinimalResponse,
    ): Promise<StreamableFile> {
        const resolvedDataset = this.resolveDataset(dataset);
        const result = await this.exportsService.generate(network, resolvedDataset, query, user);
        res.setHeader('X-Total-Matching', String(result.totalMatching));
        // Exposed so the browser fetch() in useExportsApi.ts can read it — otherwise CORS hides
        // every response header except the handful on the default allow-list.
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Matching');
        return new StreamableFile(result.content, {
            type: result.mime,
            disposition: `attachment; filename="${result.filename}"`,
            length: result.content.length,
        });
    }

    /** Path-param validation only (no business logic) — keeps the controller thin. */
    private resolveDataset(dataset: string): ExportDataset {
        if (!EXPORT_DATASETS.includes(dataset as ExportDataset)) {
            throw new BadRequestException(
                `Unknown export dataset "${dataset}". Expected one of: ${EXPORT_DATASETS.join(', ')}`,
            );
        }
        return dataset as ExportDataset;
    }
}
