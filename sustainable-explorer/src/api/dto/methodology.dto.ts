import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { MethodologyRow, MethodologyStatsRow } from '../repositories/methodology.repository';

export class MethodologyQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by methodology name (partial match)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Filter by Hedera topic ID (partial match)' })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiPropertyOptional({ description: 'Filter by description (partial match)' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Filter by status (e.g. PUBLISHED, DRAFT)' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Filter by exact registry DID' })
    @IsOptional()
    @IsString()
    registryDid?: string;

    @ApiPropertyOptional({ description: 'Filter by publishing registry name (partial match)' })
    @IsOptional()
    @IsString()
    registryName?: string;

    @ApiPropertyOptional({ description: 'Filter by version (partial match)' })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiPropertyOptional({ description: 'Filter by Policy Topic ID (exact match) — returns all versions of the same policy' })
    @IsOptional()
    @IsString()
    policyTopicId?: string;
}

export class MethodologyStats {
    @ApiProperty({ description: 'Number of projects under this methodology' })
    projectCount: number;

    @ApiProperty({ description: 'Number of credit issuances under this methodology' })
    issuanceCount: number;

    @ApiProperty({ description: 'Number of schemas associated with this methodology' })
    schemaCount: number;
}

export class MethodologyResponseDto {
    @ApiProperty({ description: 'Internal row identifier' })
    id: string;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({
        nullable: true,
        description: "Methodology's Hedera policy topic ID (frontend uses this as the methodology ID)",
    })
    topicId: string | null;

    @ApiProperty({ nullable: true, description: 'Methodology display name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Methodology description' })
    description: string | null;

    @ApiProperty({ nullable: true, description: 'Methodology status (e.g. PUBLISHED, DRAFT)' })
    status: string | null;

    @ApiProperty({ nullable: true, description: 'DID of the publishing Standard Registry' })
    registryDid: string | null;

    @ApiProperty({ nullable: true, description: 'Display name of the publishing Standard Registry' })
    registryName: string | null;

    @ApiProperty({ nullable: true, description: 'Methodology version' })
    version: string | null;

    @ApiProperty({
        nullable: true,
        description: 'Policy Topic ID (businessData.topicId) — shared across all versions of the same policy',
    })
    policyTopicId: string | null;

    @ApiProperty({ description: 'HCS consensus timestamp of the source message' })
    sourceTimestamp: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: MethodologyStats })
    stats: MethodologyStats;

    static fromRow(
        row: MethodologyRow,
        network: string,
        stats: MethodologyStatsRow,
    ): MethodologyResponseDto {
        const data = (row.businessData || {}) as Record<string, any>;
        const options = (data.options || {}) as Record<string, any>;
        const version = typeof options.version === 'string' ? options.version : null;

        const policyTopicId = typeof data.topicId === 'string' ? data.topicId : null;

        return {
            id: row.id,
            network,
            topicId: row.relatedTopicId,
            name: row.displayName,
            description: row.description,
            status: row.statusValue,
            registryDid: row.registryDid,
            registryName: row.registryName,
            version,
            policyTopicId,
            sourceTimestamp: row.sourceTimestamp,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            stats,
        };
    }
}

export class PaginatedMethodologiesDto {
    @ApiProperty({ type: [MethodologyResponseDto] })
    data: MethodologyResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
