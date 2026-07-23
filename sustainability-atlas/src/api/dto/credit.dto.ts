import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { CreditRow } from '../repositories/credit.repository';

export class CreditQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by token type',
        enum: ['Fungible', 'Non-Fungible'],
    })
    @IsOptional()
    @IsIn(['Fungible', 'Non-Fungible', 'fungible', 'non-fungible'])
    type?: string;

    @ApiPropertyOptional({ description: 'Filter by registry display name (partial match)' })
    @IsOptional()
    @IsString()
    registry?: string;

    @ApiPropertyOptional({ description: 'Filter by exact registry DID' })
    @IsOptional()
    @IsString()
    registryDid?: string;

    @ApiPropertyOptional({ description: 'Filter by exact Hedera token ID' })
    @IsOptional()
    @IsString()
    tokenId?: string;

    @ApiPropertyOptional({ description: 'Filter by exact project key (credentialSubject.id) — returns only issuances linked to this project. Supports a `|`-delimited list to scope to several projects at once.' })
    @IsOptional()
    @IsString()
    projectKey?: string;

    @ApiPropertyOptional({ description: 'Filter by methodology sourceTimestamp — returns only issuances linked to this methodology' })
    @IsOptional()
    @IsString()
    methodologyId?: string;
}

export class CreditResponseDto {
    @ApiProperty({ nullable: true, description: 'Hedera token ID' })
    tokenId: string | null;

    @ApiProperty({ nullable: true, description: 'Token name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Token symbol' })
    symbol: string | null;

    @ApiProperty({
        nullable: true,
        enum: ['Fungible', 'Non-Fungible'],
        description: 'Token type',
    })
    type: 'Fungible' | 'Non-Fungible' | null;

    @ApiProperty({ description: 'Total supply (token_cache.totalSupply ?? 0)' })
    supply: number;

    @ApiProperty({ nullable: true, description: 'credentialSubject.id of the linked project, resolved via project_mint_link.' })
    projectId: string | null;

    @ApiProperty({ nullable: true, description: 'Display name of the linked project (joined from business_view PROJECT).' })
    project: string | null;

    @ApiProperty({ nullable: true, description: 'sourceTimestamp of the linked methodology, resolved via project or direct topic match.' })
    methodologyId: string | null;

    @ApiProperty({ nullable: true, description: 'Display name of the linked methodology (joined from business_view METHODOLOGY).' })
    methodology: string | null;

    @ApiProperty({ nullable: true, description: 'Display name of the publishing Standard Registry' })
    registry: string | null;

    @ApiProperty({ nullable: true, description: 'DID of the publishing Standard Registry' })
    registryDid: string | null;

    @ApiProperty({ nullable: true, description: 'ISO date derived from the HCS consensus timestamp' })
    mintDate: string | null;

    @ApiProperty({ nullable: true, description: 'Consensus timestamp of the underlying MintToken VC. Set only for rows scoped to one project/methodology (one row per mint event); null for the network-wide token-aggregated view.' })
    mintConsensusTimestamp: string | null;

    static fromRow(row: CreditRow, _network: string): CreditResponseDto {
        return {
            tokenId: row.tokenId,
            name: row.name,
            symbol: row.symbol,
            type: row.type,
            supply: row.supply,
            projectId: row.projectId,
            project: row.project,
            methodologyId: row.methodologyId,
            methodology: row.methodology,
            registry: row.registry,
            registryDid: row.registryDid,
            mintDate: row.mintDate,
            mintConsensusTimestamp: row.mintConsensusTimestamp,
        };
    }
}

export class PaginatedCreditsDto {
    @ApiProperty({ type: [CreditResponseDto] })
    data: CreditResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
