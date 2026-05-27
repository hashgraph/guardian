import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';

export class RegistryQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by registry display name (partial match)' })
    @IsOptional()
    @IsString()
    displayName?: string;

    @ApiPropertyOptional({ description: 'Filter by exact DID' })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiPropertyOptional({ description: 'Filter by Hedera topic ID (partial match)' })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiPropertyOptional({ description: 'Filter by tags (partial match)' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'Filter by geography (partial match)' })
    @IsOptional()
    @IsString()
    geography?: string;

    @ApiPropertyOptional({ description: 'Filter by jurisdiction / law (partial match)' })
    @IsOptional()
    @IsString()
    law?: string;

    @ApiPropertyOptional({
        description: 'When true, hide registries with zero policies, projects, users and issuances.',
        type: Boolean,
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true' || value === '1')
    hideEmpty?: boolean;

    @ApiPropertyOptional({ description: 'Filter registries created on or after this date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    createdAtFrom?: string;

    @ApiPropertyOptional({ description: 'Filter registries created on or before this date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    createdAtTo?: string;
}

export class RegistryStats {
    @ApiProperty({ description: 'Number of published policies (methodologies)' })
    policyCount: number;

    @ApiProperty({ description: 'Number of projects registered under this registry' })
    projectCount: number;

    @ApiProperty({ description: 'Number of credit issuances' })
    issuanceCount: number;

    @ApiProperty({ description: 'Number of users (placeholder, always 0)' })
    userCount: number;
}

export class RegistryResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({ nullable: true, description: 'Decentralized Identifier' })
    did: string | null;

    @ApiProperty({ nullable: true, description: 'Display name (falls back to tags)' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Source HCS topic where the registry was announced' })
    topicId: string | null;

    @ApiProperty({
        nullable: true,
        description: "Registry's own Hedera topic ID where it publishes policies",
    })
    relatedTopicId: string | null;

    @ApiProperty({ nullable: true })
    geography: string | null;

    @ApiProperty({ nullable: true })
    website: string | null;

    @ApiProperty({ nullable: true })
    law: string | null;

    @ApiProperty({ nullable: true })
    tags: string | null;

    @ApiProperty({ nullable: true })
    action: string | null;

    @ApiProperty({ nullable: true })
    lang: string | null;

    @ApiProperty()
    sourceTimestamp: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: RegistryStats })
    stats: RegistryStats;

    static fromRow(row: any, network: string, stats: RegistryStats): RegistryResponseDto {
        const data = row.businessData || {};
        return {
            id: row.id,
            network,
            did: row.registryDid,
            name: row.displayName,
            topicId: data.topicId || data.options?.topicId || null,
            relatedTopicId: row.relatedTopicId ?? null,
            // Prefer top-level geography (set from profile VC's Country by the
            // business-view builder) over the legacy options.geography.
            geography: data.geography ?? data.options?.geography ?? null,
            website: data.website ?? null,
            law: data.options?.law || null,
            tags: data.options?.tags || null,
            action: data.options?.action || null,
            lang: data.options?.lang || null,
            sourceTimestamp: row.sourceTimestamp,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            stats,
        };
    }
}

export class PaginatedRegistriesDto {
    @ApiProperty({ type: [RegistryResponseDto] })
    data: RegistryResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
