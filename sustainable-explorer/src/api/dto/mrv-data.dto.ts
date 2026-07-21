import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params for GET /:id/mrv-data/:schemaUuid — a real, server-paginated table
 * view over one externalDataBlock-bound schema's VC records (as opposed to
 * additional-details, which decodes and returns every linked VC in one payload —
 * fine for a handful of human-submitted documents, unworkable for MRV datasets
 * that can run to hundreds of thousands of pushed/IoT records).
 */
export class MrvDataQueryDto {
    @ApiPropertyOptional({ default: 1, description: 'Page number (1-indexed)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 50, description: 'Rows per page (max 500)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    limit?: number = 50;

    @ApiPropertyOptional({ description: 'Column key to sort by; must be one of the schema\'s sortable columns (see MrvDataResponseDto.columns). Falls back to the date column, then consensus timestamp.' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortDir?: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({ description: 'Filter to records touching this device/measurement-point label (see MrvDataResponseDto.devices)' })
    @IsOptional()
    @IsString()
    device?: string;

    @ApiPropertyOptional({ description: 'ISO 8601 — only records whose date column is on/after this instant' })
    @IsOptional()
    @IsISO8601()
    from?: string;

    @ApiPropertyOptional({ description: 'ISO 8601 — only records whose date column is on/before this instant' })
    @IsOptional()
    @IsISO8601()
    to?: string;
}

export class MrvColumnDto {
    @ApiProperty({ description: 'Raw schema field key' })
    key: string;

    @ApiProperty({ description: 'Human-readable column label (schema title, falling back to description, falling back to a humanized key)' })
    label: string;

    @ApiProperty({ required: false, nullable: true, description: 'Field description, when defined by the schema' })
    description: string | null;

    @ApiProperty({ description: 'True for the (first-detected) date-time column — drives the default sort and the time-range filter' })
    isDate: boolean;
}

export class MrvRecordRowDto {
    @ApiProperty({ description: 'HCS consensus timestamp identifying this VC message — use with GET /:id/vc-evidence/:consensusTimestamp for the raw document' })
    consensusTimestamp: string;

    @ApiProperty({ description: 'Formatted column values keyed by column key' })
    values: Record<string, string>;

    @ApiProperty({ nullable: true, description: 'Device / measurement-point label this record (or, when flattened, this item) is associated with, when the schema has a device-like nested field' })
    device: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        description: 'Present only when MrvDataResponseDto.flattened is true — 1-based position of this item within its parent VC\'s device array, since several rows then share one consensusTimestamp',
    })
    itemIndex?: number;
}

export class MrvDataResponseDto {
    @ApiProperty({ description: 'Bare schema UUID these records were issued against' })
    schemaUuid: string;

    @ApiProperty({ nullable: true, description: 'Human-readable schema name' })
    schemaName: string | null;

    @ApiProperty({ type: [MrvColumnDto] })
    columns: MrvColumnDto[];

    @ApiProperty({ type: [MrvRecordRowDto] })
    rows: MrvRecordRowDto[];

    @ApiProperty({ description: 'Total records matching the current device/date filters (not just this page)' })
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty({ type: [String], description: 'Distinct device/measurement-point labels available to filter by (unfiltered by the current device selection, filtered by date range if set)' })
    devices: string[];

    @ApiProperty({ nullable: true, description: 'Key of the column used for the time-range filter and default sort, or null if the schema has no date-time field' })
    dateColumnKey: string | null;

    @ApiProperty({
        description:
            'True when this schema has no top-level scalar fields and its columns were promoted from a repeatable ' +
            'device/item array instead — rows are then one-per-item rather than one-per-VC, so several rows can share a consensusTimestamp.',
    })
    flattened: boolean;
}
