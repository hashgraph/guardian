import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';

export class RegistryQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        enum: ['mainnet', 'testnet', 'previewnet'],
        default: 'mainnet',
        description: 'Hedera network to query',
    })
    @IsOptional()
    @IsString()
    @IsIn(['mainnet', 'testnet', 'previewnet'])
    network?: string = 'mainnet';

    @ApiPropertyOptional({ description: 'Filter by exact DID' })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiPropertyOptional({ description: 'Filter by geography (partial match)' })
    @IsOptional()
    @IsString()
    geography?: string;
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

    @ApiProperty({ enum: ['mainnet', 'testnet', 'previewnet'] })
    network: string;

    @ApiProperty({ nullable: true, description: 'Decentralized Identifier' })
    did: string | null;

    @ApiProperty({ nullable: true, description: 'Display name (falls back to tags)' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Hedera topic ID for the registry' })
    topicId: string | null;

    @ApiProperty({ nullable: true, description: 'Geographic coverage' })
    geography: string | null;

    @ApiProperty({ nullable: true, description: 'Jurisdiction / applicable law' })
    law: string | null;

    @ApiProperty({ nullable: true, description: 'Tags / categories' })
    tags: string | null;

    @ApiProperty({ nullable: true, description: 'Latest message action (e.g., Initialization)' })
    action: string | null;

    @ApiProperty({ nullable: true })
    lang: string | null;

    @ApiProperty({ description: 'Consensus timestamp of the source HCS message' })
    sourceTimestamp: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: RegistryStats })
    stats: RegistryStats;

    static fromBusinessView(bv: any, stats?: RegistryStats): RegistryResponseDto {
        const data = bv.businessData || {};
        return {
            id: bv.id,
            network: bv.network,
            did: bv.registryDid,
            name: bv.displayName,
            topicId: data.topicId || data.options?.topicId || null,
            geography: data.options?.geography || null,
            law: data.options?.law || null,
            tags: data.options?.tags || null,
            action: data.options?.action || null,
            lang: data.options?.lang || null,
            sourceTimestamp: bv.sourceTimestamp,
            createdAt: bv.createdAt,
            updatedAt: bv.updatedAt,
            stats: stats || {
                policyCount: 0,
                projectCount: 0,
                issuanceCount: 0,
                userCount: 0,
            },
        };
    }
}

export class PaginatedRegistriesDto {
    @ApiProperty({ type: [RegistryResponseDto] })
    data: RegistryResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
