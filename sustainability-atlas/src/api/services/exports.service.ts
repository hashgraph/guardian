import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { SystemDataSource } from '@api/database/system-database.module';
import { AuditLog } from '@shared/entities/auth/audit-log.entity';
import { User } from '@shared/entities/auth/user.entity';
import {
    ExportQueryDto,
    ExportHistoryQueryDto,
    ExportHistoryItemDto,
    PaginatedExportHistoryDto,
    ExportFormat,
} from '../dto/export.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { AuthenticatedUser } from '../auth/auth.types';
import {
    ExportDataset,
    getExportFieldKeys,
    getDefaultSelectedFieldKeys,
} from '@shared/config/export-field-catalog';
import { buildVerificationUrl, sourceSystemLabel } from '@shared/utils/hashscan-url';
import { Serializer } from './export/serializer.interface';
import { CsvSerializer } from './export/csv-serializer';
import { XlsxSerializer } from './export/xlsx-serializer';
import { PdfSerializer } from './export/pdf-serializer';
import { CreditRepository } from '../repositories/credit.repository';
import { PgCreditRepository } from '../repositories/pg-credit.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { PgProjectRepository } from '../repositories/pg-project.repository';
import { MethodologyRepository } from '../repositories/methodology.repository';
import { PgMethodologyRepository } from '../repositories/pg-methodology.repository';
import { RegistryRepository } from '../repositories/registry.repository';
import { PgRegistryRepository } from '../repositories/pg-registry.repository';

/** Result of one generation — the controller wraps this in a StreamableFile. */
export interface GeneratedExport {
    content: Buffer;
    mime: string;
    filename: string;
    recordCount: number;
}

/** Raw identifiers every `findAllForExport` row carries alongside its dataset-specific catalog-keyed fields; consumed by `applyTraceabilityFields` below to synthesize the 4 dataset-agnostic Traceability References columns in one shared place. */
interface TraceabilityIdentifiers {
    _consensusTimestamp: string | null;
    _tokenId: string | null;
    _topicId: string | null;
    _dataSource: string | null;
}

function asStr(v: unknown): string | undefined {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asBool(v: unknown): boolean | undefined {
    return typeof v === 'boolean' ? v : undefined;
}

function asDecodeStatusArr(v: unknown): ('success' | 'failed' | 'pending' | 'unknown')[] | undefined {
    return Array.isArray(v) ? (v as ('success' | 'failed' | 'pending' | 'unknown')[]) : undefined;
}

/** Raw shape of an `export.*` audit_log row as read back for the history list. */
interface ExportAuditRow {
    id: string;
    detail: Record<string, unknown> | null;
    createdAt: Date;
}

@Injectable()
export class ExportsService {
    private readonly logger = new Logger(ExportsService.name);

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly systemDataSource: SystemDataSource,
    ) {}

    /** Generates a fresh export for `dataset`, best-effort audit-logs the generation (exports are streamed, never persisted; `audit_log` is the sole record of "this happened"), and returns the generated file content. */
    async generate(
        network: string,
        dataset: ExportDataset,
        query: ExportQueryDto,
        user: AuthenticatedUser,
    ): Promise<GeneratedExport> {
        const fields = this.resolveFields(dataset, query.fields);
        const filters = this.extractFilters(query);

        const rows = await this.fetchRowsForExport(dataset, network, filters);

        const serializer = this.selectSerializer(query.format);
        const { content, mime, extension } = await serializer.serialize(fields, rows);
        const filename = `${dataset}-export-${this.timestampSlug()}.${extension}`;

        await this.auditExport({
            action: 'export.create',
            actor: user,
            network,
            dataset,
            filename,
            format: query.format,
            recordCount: query.format === 'pdf' ? null : rows.length,
            fieldCount: fields.length,
        });

        return { content, mime, filename, recordCount: rows.length };
    }

    /**
     * Paginated "Recent Exports" history from `export.*` audit_log entries, newest first. Visibility is decided
     * server-side from the JWT role: admins see every user's exports on this network; regular users see only
     * their own. No download/re-download action; the file itself is never persisted.
     */
    async listExports(
        network: string,
        viewer: { id: string; isAdmin: boolean },
        query: ExportHistoryQueryDto,
    ): Promise<PaginatedExportHistoryDto> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;
        const ds = this.systemDataSource.getDataSource();

        // $1 = network (always). Non-admins additionally scope to their own rows.
        const filters: unknown[] = [network];
        let where = `action LIKE 'export.%' AND (network = $1 OR network IS NULL)`;
        if (!viewer.isAdmin) {
            filters.push(viewer.id);
            where += ` AND "actorUserId" = $2`;
        }

        const [rawRows, countRows] = await Promise.all([
            ds.query(
                `SELECT id, detail, "createdAt" FROM audit_log
                 WHERE ${where}
                 ORDER BY "createdAt" DESC
                 LIMIT $${filters.length + 1} OFFSET $${filters.length + 2}`,
                [...filters, limit, offset],
            ) as Promise<ExportAuditRow[]>,
            ds.query(
                `SELECT COUNT(*)::int AS count FROM audit_log WHERE ${where}`,
                filters,
            ) as Promise<{ count: number }[]>,
        ]);

        const total = countRows[0]?.count ?? 0;
        const data = rawRows.map((row) => this.toHistoryItem(row));
        return new PaginatedResponse(data, total, page, limit) as PaginatedExportHistoryDto;
    }

    /** Resolves and validates the requested field keys, or falls back to the catalog's defaults. */
    private resolveFields(dataset: ExportDataset, requested?: string[]): string[] {
        if (!requested || requested.length === 0) {
            return getDefaultSelectedFieldKeys(dataset);
        }
        const valid = new Set(getExportFieldKeys(dataset));
        const unknown = requested.filter((key) => !valid.has(key));
        if (unknown.length > 0) {
            throw new BadRequestException(
                `Unknown export field(s) for dataset "${dataset}": ${unknown.join(', ')}`,
            );
        }
        return requested;
    }

    /** Strips the non-filter DTO fields (format/fields/dataset/page/limit) so only actual scope filters remain. */
    private extractFilters(query: ExportQueryDto): Record<string, unknown> {
        const { format: _format, fields: _fields, dataset: _dataset, page: _page, limit: _limit, ...rest } = query;
        return Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
    }

    /** Full filtered dataset for `dataset`, sourced from that domain's `findAllForExport(filters)` (each batched internally, never `@Max(1000)`-capped, never HTTP page-looped); adds the 4 dataset-agnostic Traceability References columns uniformly across every dataset before returning. */
    private async fetchRowsForExport(
        dataset: ExportDataset,
        network: string,
        filters: Record<string, unknown>,
    ): Promise<Record<string, unknown>[]> {
        const rows = await this.fetchRawRowsForDataset(dataset, network, filters);
        return rows.map((row) => this.applyTraceabilityFields(row, network));
    }

    private async fetchRawRowsForDataset(
        dataset: ExportDataset,
        network: string,
        filters: Record<string, unknown>,
    ): Promise<TraceabilityIdentifiers[]> {
        switch (dataset) {
            case 'credits':
                return this.getCreditRepository(network).findAllForExport({
                    search: asStr(filters.search),
                    type: asStr(filters.type),
                    registry: asStr(filters.registry),
                    registryDid: asStr(filters.registryDid),
                    tokenId: asStr(filters.tokenId),
                    projectKey: asStr(filters.projectKey),
                    methodologyId: asStr(filters.methodologyId),
                });
            case 'projects':
                return this.getProjectRepository(network).findAllForExport({
                    search: asStr(filters.search),
                    name: asStr(filters.name),
                    country: asStr(filters.country),
                    methodology: asStr(filters.methodology),
                    registry: asStr(filters.registry),
                    developer: asStr(filters.developer),
                    vintage: asStr(filters.vintage),
                    status: asStr(filters.status),
                    policyTopicId: asStr(filters.policyTopicId),
                    instanceTopicId: asStr(filters.instanceTopicId),
                });
            case 'methodologies':
                return this.getMethodologyRepository(network).findAllForExport({
                    search: asStr(filters.search),
                    name: asStr(filters.name),
                    id: asStr(filters.id),
                    description: asStr(filters.description),
                    decodeStatus: asDecodeStatusArr(filters.decodeStatus),
                    registryDid: asStr(filters.registryDid),
                    // ExportQueryDto exposes the registry filter as `registry` (not `registryName`); map it to
                    // the methodology repo's `registryName` param so the registry scope filter actually applies.
                    registryName: asStr(filters.registry) ?? asStr(filters.registryName),
                    version: asStr(filters.version),
                    policyTopicId: asStr(filters.policyTopicId),
                });
            case 'registries':
                return this.getRegistryRepository(network).findAllForExport({
                    search: asStr(filters.search),
                    displayName: asStr(filters.displayName),
                    did: asStr(filters.did),
                    id: asStr(filters.id),
                    tags: asStr(filters.tags),
                    geography: asStr(filters.geography),
                    law: asStr(filters.law),
                    hideEmpty: asBool(filters.hideEmpty),
                    createdAtFrom: asStr(filters.createdAtFrom),
                    createdAtTo: asStr(filters.createdAtTo),
                });
        }
    }

    /**
     * Synthesizes the 4 dataset-agnostic Traceability References columns from a row's raw `_*` identifiers:
     * `transaction_id` (the mint-event consensus timestamp, never the token ID), `registry_record_id` (the raw
     * Hedera `tokenId`), `verification_url` (via `buildVerificationUrl()`, preferring transaction > token > topic),
     * and `source_system_id` (`message.dataSource` mapped via `sourceSystemLabel()`).
     */
    private applyTraceabilityFields(
        row: TraceabilityIdentifiers,
        network: string,
    ): Record<string, unknown> {
        return {
            ...(row as unknown as Record<string, unknown>),
            transaction_id: row._consensusTimestamp ?? null,
            registry_record_id: row._tokenId ?? null,
            verification_url: buildVerificationUrl(network, {
                consensusTimestamp: row._consensusTimestamp,
                tokenId: row._tokenId,
                topicId: row._topicId,
            }) || null,
            source_system_id: sourceSystemLabel(row._dataSource),
        };
    }

    private getCreditRepository(network: string): CreditRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgCreditRepository(ds);
    }

    private getProjectRepository(network: string): ProjectRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgProjectRepository(ds);
    }

    private getMethodologyRepository(network: string): MethodologyRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgMethodologyRepository(ds);
    }

    private getRegistryRepository(network: string): RegistryRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgRegistryRepository(ds);
    }

    /** Selects the format-specific serializer (src/api/services/export/*.ts). */
    private selectSerializer(format: ExportFormat): Serializer {
        switch (format) {
            case 'csv':
                return new CsvSerializer();
            case 'xlsx':
                return new XlsxSerializer();
            case 'pdf':
                return new PdfSerializer();
        }
    }

    private timestampSlug(): string {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    /** Maps one `export.*` audit_log row's `detail` jsonb into a history list item. */
    private toHistoryItem(row: ExportAuditRow): ExportHistoryItemDto {
        const detail = row.detail ?? {};
        const exportedByName = typeof detail.exportedByName === 'string' ? detail.exportedByName : '';
        const exportedByEmail = typeof detail.exportedByEmail === 'string' ? detail.exportedByEmail : '';
        return {
            id: row.id,
            filename: typeof detail.filename === 'string' ? detail.filename : '',
            format: typeof detail.format === 'string' ? detail.format : '',
            recordCount: typeof detail.recordCount === 'number' ? detail.recordCount : null,
            exportedBy: exportedByName || exportedByEmail || 'Unknown',
            createdAt: row.createdAt,
        };
    }

    /** Best-effort audit write, mirroring `AdminUsersService.audit()`; never converts a successful export into a 500 (failures are logged and swallowed), and the row is denormalized so the Recent Exports list never needs a join back to `users`. */
    private async auditExport(params: {
        action: 'export.create';
        actor: AuthenticatedUser;
        network: string;
        dataset: ExportDataset;
        filename: string;
        format: ExportFormat;
        recordCount: number | null;
        fieldCount: number;
    }): Promise<void> {
        try {
            const user = await this.systemDataSource
                .getRepository(User)
                .findOne({ where: { id: params.actor.id } });
            const exportedByName = user
                ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
                : '';

            const repo = this.systemDataSource.getRepository(AuditLog);
            await repo.save(
                repo.create({
                    action: params.action,
                    outcome: 'success',
                    actorUserId: params.actor.id,
                    targetType: 'export',
                    targetId: params.dataset,
                    network: params.network,
                    ip: null,
                    userAgent: null,
                    detail: {
                        filename: params.filename,
                        format: params.format,
                        recordCount: params.recordCount,
                        dataset: params.dataset,
                        fieldCount: params.fieldCount,
                        exportedByName: exportedByName || null,
                        exportedByEmail: params.actor.email,
                    },
                }),
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`audit_log write failed [action=${params.action}]: ${msg}`);
        }
    }
}
