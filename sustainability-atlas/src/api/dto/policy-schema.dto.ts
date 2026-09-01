import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { PolicySchemaRow } from '../repositories/policy-schema.repository';

export class PolicySchemaQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by schema ID (partial match)' })
    @IsOptional()
    @IsString()
    schemaId?: string;

    @ApiPropertyOptional({ description: 'Filter by schema name (partial match)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Filter by schema description (partial match)' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Filter by exact source CID' })
    @IsOptional()
    @IsString()
    sourceCid?: string;

    @ApiPropertyOptional({ description: 'Filter by schema version (partial match)' })
    @IsOptional()
    @IsString()
    version?: string;
}

export class PolicySchemaResponseDto {
    @ApiProperty({ description: 'Internal row identifier' })
    id: string;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({ description: 'Methodology/policy topic ID this schema belongs to' })
    policyTopicId: string;

    @ApiProperty({ nullable: true, description: 'Consensus timestamp of the published policy message' })
    messageTimestamp: string | null;

    @ApiProperty({ description: 'Source policy archive CID' })
    sourceCid: string;

    @ApiProperty({ description: 'Path of the schema file inside the zip archive' })
    schemaFile: string;

    @ApiProperty({ description: 'Schema identifier (uuid/iri/document.$id fallback)' })
    schemaId: string;

    @ApiProperty({ description: 'Schema version (empty string when unavailable)' })
    version: string;

    @ApiProperty({ nullable: true, description: 'Schema name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Schema description' })
    description: string | null;

    @ApiProperty({ nullable: true, description: 'Schema document section from the source file' })
    document: Record<string, unknown> | null;

    @ApiProperty({ description: 'Raw schema JSON payload from the source file' })
    rawSchema: Record<string, unknown>;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static fromRow(row: PolicySchemaRow, network: string): PolicySchemaResponseDto {
        return {
            id: row.id,
            network,
            policyTopicId: row.policyTopicId,
            messageTimestamp: row.messageConsensusTimestamp,
            sourceCid: row.sourceCid,
            schemaFile: row.schemaFile,
            schemaId: row.schemaId,
            version: row.schemaVersion,
            name: row.name,
            description: row.description,
            document: row.document,
            rawSchema: row.rawSchema,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

export class PaginatedPolicySchemasDto {
    @ApiProperty({ type: [PolicySchemaResponseDto] })
    data: PolicySchemaResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
