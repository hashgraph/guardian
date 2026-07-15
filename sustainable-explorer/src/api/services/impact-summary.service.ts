import pdfMake = require('pdfmake');
import { Injectable, Logger } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { SystemDataSource } from '@api/database/system-database.module';
import { User } from '@shared/entities/auth/user.entity';
import { AuditLog } from '@shared/entities/auth/audit-log.entity';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgImpactSummaryRepository } from '../repositories/pg-impact-summary.repository';
import { ImpactSummaryRepository } from '../repositories/impact-summary.repository';
import { ImpactSummaryResponseDto, buildImpactSummaryResponse } from '../dto/impact-summary.dto';
import { AuthenticatedUser } from '../auth/auth.types';
import { ExportFormat } from '../dto/export.dto';
import { generateReportId, IMPACT_SUMMARY_EXPORT_ACTION } from './impact-summary/report-id';
import {
    buildImpactSummaryPdfDocDefinition,
    IMPACT_SUMMARY_PDF_FONTS,
    ImpactSummaryGeneratedBy,
    ImpactSummaryReportScope,
} from './impact-summary/pdf-template';
import {
    buildImpactSummaryCsvBuffer,
    buildImpactSummaryWorkbookBuffer,
    countImpactSummaryRows,
    ImpactSummaryTabularParams,
} from './impact-summary/xlsx-template';

/** Result of `buildPdfDocument()` — the docDefinition plus the metadata the streaming endpoint needs to render/log the generation. */
export interface ImpactSummaryPdfBuild {
    docDefinition: TDocumentDefinitions;
    reportId: string;
    summary: ImpactSummaryResponseDto;
}

/** Result of `generateDocument()` — ready for `ExportsController`-style `StreamableFile` wrapping. */
export interface GeneratedImpactSummaryDocument {
    content: Buffer;
    mime: string;
    filename: string;
    /** Rows across every breakdown section (csv/xlsx); null for the curated PDF, matching the mockup's "—" record count. */
    recordCount: number | null;
}

/** Shared inputs every format's renderer needs — gathered once per generation. */
interface ReportContext {
    summary: ImpactSummaryResponseDto;
    reportId: string;
    generatedAt: Date;
    generatedBy?: ImpactSummaryGeneratedBy;
}

/**
 * Resolves the per-network DataSource and delegates to PgImpactSummaryRepository — thin pass-through, matching
 * `SdgsService`/`DashboardService`'s `getRepository(network)` convention. All aggregation SQL lives in the
 * repository; all response shaping lives in the pure `buildImpactSummaryResponse` builder. `SystemDataSource` is
 * only needed for `buildPdfDocument()`'s report-ID sequence; `getSummary()` still only touches the per-network DataSource.
 */
@Injectable()
export class ImpactSummaryService {
    private readonly logger = new Logger(ImpactSummaryService.name);

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly systemDataSource: SystemDataSource,
    ) {}

    async getSummary(network: string): Promise<ImpactSummaryResponseDto> {
        const repo = this.getRepository(network);
        const row = await repo.getSummary(network);
        return buildImpactSummaryResponse(row, network);
    }

    /**
     * Builds the Impact Summary PDF's pdfmake `TDocumentDefinitions`. Does NOT call `pdfMake.createPdf()`/write
     * a PDF buffer, and does NOT write the `audit_log` "export.impact_summary" row — both are
     * `generateDocument()`'s job. Kept as a separate public method since it returns the `TDocumentDefinitions`
     * itself, which a future in-app live-preview endpoint could reuse without paying for PDF byte generation.
     */
    async buildPdfDocument(
        network: string,
        scope?: ImpactSummaryReportScope,
        user?: AuthenticatedUser,
    ): Promise<ImpactSummaryPdfBuild> {
        const { summary, reportId, generatedAt, generatedBy } = await this.gatherReportContext(network, user);

        const docDefinition = buildImpactSummaryPdfDocDefinition({
            summary,
            network,
            reportId,
            scope,
            generatedAt,
            generatedBy,
        });

        return { docDefinition, reportId, summary };
    }

    /**
     * Generates the Impact Summary document in the requested format (csv/xlsx/pdf), streams-ready as a `Buffer`,
     * and best-effort audit-logs the generation to `audit_log` (`action='export.impact_summary'`). Mirrors
     * `ExportsService.generate()`'s shape so `ImpactSummaryController.exportSummary()` wraps the result in a
     * `StreamableFile` exactly like `ExportsController`. PDF is the curated top-N report (`pdf-template.ts`);
     * CSV/XLSX carry the full underlying breakdown datasets (`xlsx-template.ts`).
     */
    async generateDocument(
        network: string,
        format: ExportFormat,
        scope: ImpactSummaryReportScope | undefined,
        user: AuthenticatedUser,
    ): Promise<GeneratedImpactSummaryDocument> {
        const context = await this.gatherReportContext(network, user);
        const tabularParams: ImpactSummaryTabularParams = { ...context, network, scope };

        const { content, mime, extension, recordCount } = await this.renderDocument(format, tabularParams);
        const filename = ImpactSummaryService.buildFilename(context.generatedAt, extension);

        await this.auditImpactSummaryExport({
            actor: user,
            network,
            filename,
            format,
            recordCount,
            reportId: context.reportId,
        });

        return { content, mime, filename, recordCount };
    }

    /** Fetches the aggregate + generates the report ID + resolves the "Generated by" identity, once per generation. Shared by `buildPdfDocument()` and `generateDocument()`. */
    private async gatherReportContext(network: string, user?: AuthenticatedUser): Promise<ReportContext> {
        const generatedAt = new Date();
        const [summary, reportId, generatedBy] = await Promise.all([
            this.getSummary(network),
            generateReportId(this.systemDataSource, network, generatedAt),
            this.resolveGeneratedBy(user),
        ]);
        return { summary, reportId, generatedAt, generatedBy };
    }

    /** Renders one format's file bytes from the shared report context. */
    private async renderDocument(
        format: ExportFormat,
        params: ImpactSummaryTabularParams,
    ): Promise<{ content: Buffer; mime: string; extension: string; recordCount: number | null }> {
        switch (format) {
            case 'pdf': {
                const docDefinition = buildImpactSummaryPdfDocDefinition(params);
                pdfMake.setFonts(IMPACT_SUMMARY_PDF_FONTS);
                const content = await pdfMake.createPdf(docDefinition).getBuffer();
                return { content, mime: 'application/pdf', extension: 'pdf', recordCount: null };
            }
            case 'xlsx': {
                const content = await buildImpactSummaryWorkbookBuffer(params);
                return {
                    content,
                    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    extension: 'xlsx',
                    recordCount: countImpactSummaryRows(params.summary),
                };
            }
            case 'csv': {
                const content = buildImpactSummaryCsvBuffer(params);
                return { content, mime: 'text/csv', extension: 'csv', recordCount: countImpactSummaryRows(params.summary) };
            }
        }
    }

    /** `impact-summary-{yyyy}-{mmdd}.{ext}` — UTC, matching the `impact-summary-2026.pdf`-style naming convention. */
    private static buildFilename(generatedAt: Date, extension: string): string {
        const yyyy = generatedAt.getUTCFullYear();
        const mm = String(generatedAt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(generatedAt.getUTCDate()).padStart(2, '0');
        return `impact-summary-${yyyy}-${mm}${dd}.${extension}`;
    }

    /** Best-effort audit write, mirroring `ExportsService.auditExport()`; never converts a successful generation into a 500 (failures are logged and swallowed). `recordCount` is null for PDF (a curated report, not a row dump). */
    private async auditImpactSummaryExport(params: {
        actor: AuthenticatedUser;
        network: string;
        filename: string;
        format: ExportFormat;
        recordCount: number | null;
        reportId: string;
    }): Promise<void> {
        try {
            const user = await this.systemDataSource.getRepository(User).findOne({ where: { id: params.actor.id } });
            const exportedByName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() : '';

            const repo = this.systemDataSource.getRepository(AuditLog);
            await repo.save(
                repo.create({
                    action: IMPACT_SUMMARY_EXPORT_ACTION,
                    outcome: 'success',
                    actorUserId: params.actor.id,
                    targetType: 'export',
                    targetId: 'impact_summary',
                    network: params.network,
                    ip: null,
                    userAgent: null,
                    detail: {
                        filename: params.filename,
                        format: params.format,
                        recordCount: params.recordCount,
                        dataset: 'impact_summary',
                        reportId: params.reportId,
                        exportedByName: exportedByName || null,
                        exportedByEmail: params.actor.email,
                    },
                }),
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`audit_log write failed [action=${IMPACT_SUMMARY_EXPORT_ACTION}]: ${msg}`);
        }
    }

    /** `AuthenticatedUser` only carries `email` — a display name requires the same `User` lookup `ExportsService.auditExport()` already does. Best-effort: falls back to email-only rather than failing generation if the lookup errors. */
    private async resolveGeneratedBy(user?: AuthenticatedUser): Promise<ImpactSummaryGeneratedBy | undefined> {
        if (!user) return undefined;
        try {
            const row = await this.systemDataSource.getRepository(User).findOne({ where: { id: user.id } });
            const name = row ? [row.firstName, row.lastName].filter(Boolean).join(' ').trim() : '';
            return { name: name || null, email: user.email };
        } catch {
            return { name: null, email: user.email };
        }
    }

    private getRepository(network: string): ImpactSummaryRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgImpactSummaryRepository(ds);
    }
}
