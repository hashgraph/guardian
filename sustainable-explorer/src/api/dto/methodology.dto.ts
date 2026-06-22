import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { MethodologyRow, MethodologyStatsRow } from '../repositories/methodology.repository';
import { IssuanceDto } from './project.dto';

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

    @ApiPropertyOptional({
        description: 'Filter by decode status. Pipe-separate multiple values (e.g. "success|failed").',
        example: 'success|failed',
    })
    @IsOptional()
    @IsString()
    decodeStatus?: string;

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
    @ApiProperty({ description: 'Total number of projects across all versions of this methodology' })
    projectCount: number;

    @ApiProperty({ description: 'Number of projects published under this specific methodology version (instance topic)' })
    instanceProjectCount: number;

    @ApiProperty({ description: 'Number of credit issuances under this methodology, across all versions' })
    issuanceCount: number;

    @ApiProperty({ description: 'Number of credit issuances minted for this specific methodology version (instance topic)' })
    instanceIssuanceCount: number;

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

    @ApiProperty({ nullable: true, type: [String], description: 'Sectoral scopes extracted from policy categoriesExport' })
    sectoralScopes: string[] | null;

    @ApiProperty({ nullable: true, description: 'Emission reduction approach: Avoidance, Removal, or Avoidance & Removal' })
    emissionReductionApproach: string | null;

    @ApiProperty({ description: 'HCS consensus timestamp of the source message' })
    sourceTimestamp: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: MethodologyStats })
    stats: MethodologyStats;

    @ApiProperty({ type: [IssuanceDto], description: 'Linked token issuances for this methodology' })
    issuances: IssuanceDto[];

    @ApiProperty({ description: 'Total credits ever minted (NFT serials + fungible supply)' })
    totalIssued: number;

    @ApiProperty({ description: 'Total credits retired (NFT serials marked deleted by Mirror Node)' })
    totalRetired: number;

    @ApiProperty({ description: 'Credits currently in circulation (totalIssued - totalRetired)' })
    totalActive: number;

    @ApiProperty({
        enum: ['success', 'failed', 'pending', 'unknown'],
        description:
            'Decode status of the methodology\'s policy ZIP. ' +
            '"unknown" means no decode attempt has been made yet.',
    })
    decodeStatus: 'success' | 'failed' | 'pending' | 'unknown';

    @ApiProperty({
        nullable: true,
        description: 'IPFS CID of the policy ZIP (the methodology definition package), or null if not decoded yet',
    })
    policySourceCid: string | null;

    static fromRow(
        row: MethodologyRow,
        network: string,
        stats: MethodologyStatsRow,
    ): MethodologyResponseDto {
        const data = (row.businessData || {}) as Record<string, any>;
        const options = (data.options || {}) as Record<string, any>;
        const version = typeof options.version === 'string' ? options.version : null;

        const policyTopicId = typeof data.topicId === 'string' ? data.topicId : null;

        const rawDecodeStatus = row.decodeStatus;
        const decodeStatus: MethodologyResponseDto['decodeStatus'] =
            rawDecodeStatus === 'success' ||
            rawDecodeStatus === 'failed' ||
            rawDecodeStatus === 'pending'
                ? rawDecodeStatus
                : 'unknown';

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
            sectoralScopes: row.sectoralScopes,
            emissionReductionApproach: row.emissionReductionApproach,
            sourceTimestamp: row.sourceTimestamp,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            stats,
            issuances: (row.issuances ?? []).map(i => ({
                tokenId: i.tokenId,
                name: i.name,
                symbol: i.symbol,
                type: i.type,
                supply: i.supply,
                mintDate: i.mintDate,
                rawVc: i.rawVc ?? null,
            })),
            totalIssued: row.totalIssued ?? 0,
            totalRetired: row.totalRetired ?? 0,
            totalActive: row.totalActive ?? 0,
            decodeStatus,
            policySourceCid: row.policySourceCid ?? null,
        };
    }
}

export class PaginatedMethodologiesDto {
    @ApiProperty({ type: [MethodologyResponseDto] })
    data: MethodologyResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
