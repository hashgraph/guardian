import { IsOptional, IsString, IsIn, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { ExportDataset } from '@shared/config/export-field-catalog';

/** The 3 output formats the export engine supports: hand-rolled CSV, exceljs XLSX, pdfmake PDF. */
export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** The 4 exportable datasets (mirrors `ExportDataset` in export-field-catalog.ts). */
export const EXPORT_DATASETS: readonly ExportDataset[] = [
    'credits',
    'projects',
    'methodologies',
    'registries',
] as const;

/**
 * Query DTO for `GET /api/v1/:network/exports/:dataset`. Flattens the optional filter fields of the per-domain
 * query DTOs (TypeScript can't `extends` more than one class), and although it extends `PaginationQueryDto`,
 * `page`/`limit` are ignored — exports always fetch the full filtered dataset via a dedicated non-paginated repo path.
 */
export class ExportQueryDto extends PaginationQueryDto {
    // ---- format / field selection (every dataset) ----

    @ApiProperty({ enum: EXPORT_FORMATS, description: 'Output file format' })
    @IsIn(EXPORT_FORMATS)
    format: ExportFormat;

    @ApiPropertyOptional({
        type: [String],
        description:
            'Selected export-field-catalog keys (snake_case, e.g. "emissions_reduced,transaction_id"). ' +
            'Accepts a comma-separated string or a repeated query param. When omitted, the catalog\'s ' +
            'defaultSelected keys for the dataset are used.',
    })
    @IsOptional()
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value
            : String(value)
                  // Accepts "|" or "," separated values, or a repeated query param (the Array case above).
                  .split(/[|,]/)
                  .map((v: string) => v.trim())
                  .filter(Boolean),
    )
    @IsArray()
    @IsString({ each: true })
    fields?: string[];

    @ApiPropertyOptional({
        enum: EXPORT_DATASETS,
        description:
            'Dataset being exported. Informational — the authoritative value for the live download ' +
            'route is the `:dataset` path segment; this field exists so the same DTO shape can carry ' +
            'the dataset when reused outside that route (e.g. future request-body variants).',
    })
    @IsOptional()
    @IsIn(EXPORT_DATASETS)
    dataset?: ExportDataset;

    // ---- credits (mirrors CreditQueryDto) ----

    @ApiPropertyOptional({ description: 'Credits: filter by token type', enum: ['Fungible', 'Non-Fungible'] })
    @IsOptional()
    @IsIn(['Fungible', 'Non-Fungible', 'fungible', 'non-fungible'])
    type?: string;

    @ApiPropertyOptional({ description: 'Credits/Projects/Methodologies: filter by registry display name (partial match)' })
    @IsOptional()
    @IsString()
    registry?: string;

    @ApiPropertyOptional({ description: 'Credits/Methodologies: filter by exact registry DID' })
    @IsOptional()
    @IsString()
    registryDid?: string;

    @ApiPropertyOptional({ description: 'Credits: filter by exact Hedera token ID' })
    @IsOptional()
    @IsString()
    tokenId?: string;

    @ApiPropertyOptional({ description: 'Credits: filter by exact project key (credentialSubject.id)' })
    @IsOptional()
    @IsString()
    projectKey?: string;

    @ApiPropertyOptional({ description: 'Credits: filter by methodology sourceTimestamp' })
    @IsOptional()
    @IsString()
    methodologyId?: string;

    // ---- projects (mirrors ProjectQueryDto) ----

    @ApiPropertyOptional({ description: 'Projects: filter by project name (partial match)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by country name (partial match)' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by methodology name (partial match)' })
    @IsOptional()
    @IsString()
    methodology?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by developer name (partial match)' })
    @IsOptional()
    @IsString()
    developer?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by vintage year (exact match, e.g. "2022")' })
    @IsOptional()
    @IsString()
    vintage?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by project status (exact match, e.g. "Issuing")' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by policy topic ID (exact match)' })
    @IsOptional()
    @IsString()
    policyTopicId?: string;

    @ApiPropertyOptional({ description: 'Projects: filter by instance topic ID (exact match)' })
    @IsOptional()
    @IsString()
    instanceTopicId?: string;

    // ---- methodologies (mirrors MethodologyQueryDto) ----

    @ApiPropertyOptional({ description: 'Methodologies/Registries: filter by Hedera topic ID (partial match)' })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiPropertyOptional({ description: 'Methodologies: filter by description (partial match)' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Methodologies: filter by decode status. Pipe-separate multiple values (e.g. "success|failed").',
        enum: ['success', 'failed', 'pending', 'unknown'],
    })
    @IsOptional()
    @Transform(({ value }) => (Array.isArray(value) ? value : String(value).split('|').filter(Boolean)))
    @IsIn(['success', 'failed', 'pending', 'unknown'], { each: true })
    decodeStatus?: ('success' | 'failed' | 'pending' | 'unknown')[];

    // ---- registries (mirrors RegistryQueryDto) ----

    @ApiPropertyOptional({ description: 'Registries: filter by display name (partial match)' })
    @IsOptional()
    @IsString()
    displayName?: string;

    @ApiPropertyOptional({ description: 'Registries: filter by exact DID' })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiPropertyOptional({ description: 'Registries: filter by tags (partial match)' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'Registries: filter by geography (partial match)' })
    @IsOptional()
    @IsString()
    geography?: string;

    @ApiPropertyOptional({ description: 'Registries: filter by jurisdiction/law (partial match)' })
    @IsOptional()
    @IsString()
    law?: string;

    @ApiPropertyOptional({
        description: 'Registries: when true, hide registries with zero policies, projects, users and issuances.',
        type: Boolean,
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true' || value === '1')
    hideEmpty?: boolean;

    @ApiPropertyOptional({ description: 'Registries: filter created on or after this date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    createdAtFrom?: string;

    @ApiPropertyOptional({ description: 'Registries: filter created on or before this date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    createdAtTo?: string;
}

/** Query DTO for `GET /api/v1/:network/exports` (Recent Exports history list); backed by `audit_log`, scoped to the current user's own `export.*` entries, so only pagination applies. */
export class ExportHistoryQueryDto extends PaginationQueryDto {}

/** One row of the current user's export history, denormalized from `audit_log.detail` jsonb — exports are streamed, never persisted, so there's no separate file record to join against. */
export class ExportHistoryItemDto {
    @ApiProperty({ description: 'audit_log row id' })
    id: string;

    @ApiProperty()
    filename: string;

    @ApiProperty({ enum: EXPORT_FORMATS })
    format: string;

    @ApiProperty({ nullable: true, description: 'Rows in the generated file; null for curated PDF documents' })
    recordCount: number | null;

    @ApiProperty({ description: 'Display name (or email fallback) of the user who generated the export' })
    exportedBy: string;

    @ApiProperty()
    createdAt: Date;
}

export class PaginatedExportHistoryDto {
    @ApiProperty({ type: [ExportHistoryItemDto] })
    data: ExportHistoryItemDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
