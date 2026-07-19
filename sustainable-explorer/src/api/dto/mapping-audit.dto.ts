import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MappingAuditQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-indexed)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Items per page' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;
}

export class MappingAuditEntryDto {
    @ApiProperty({ description: 'audit_log row id' })
    id: string;

    @ApiProperty({ description: 'Email of the admin who made the change' })
    actorEmail: string;

    @ApiProperty({ type: [String], description: 'Field labels touched by this edit (fieldMap keys)' })
    changedLabels: string[];

    @ApiProperty({ description: 'ISO 8601 timestamp of the edit' })
    createdAt: string;
}

export class PaginatedMappingAuditDto {
    @ApiProperty({ type: [MappingAuditEntryDto] })
    data: MappingAuditEntryDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
