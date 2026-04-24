import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { ProjectRow } from '../repositories/project.repository';

export class IssuanceDto {
    @ApiProperty({ description: 'Hedera token ID (e.g. 0.0.12345)' })
    tokenId: string;

    @ApiProperty({ nullable: true, description: 'Token name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Token symbol' })
    symbol: string | null;

    @ApiProperty({ nullable: true, description: 'Token type (FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE)' })
    type: string | null;

    @ApiProperty({ description: 'Total supply of the token' })
    supply: number;

    @ApiProperty({ nullable: true, description: 'Date the token was minted (YYYY-MM-DD)' })
    mintDate: string | null;
}

export class ProjectQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by project name (partial match)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Filter by country name (partial match)' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Filter by methodology name (partial match)' })
    @IsOptional()
    @IsString()
    methodology?: string;

    @ApiPropertyOptional({ description: 'Filter by publishing registry name (partial match)' })
    @IsOptional()
    @IsString()
    registry?: string;

    @ApiPropertyOptional({ description: 'Filter by developer name (partial match)' })
    @IsOptional()
    @IsString()
    developer?: string;

    @ApiPropertyOptional({ description: 'Filter by vintage year (exact match, e.g. "2022")' })
    @IsOptional()
    @IsString()
    vintage?: string;

    @ApiPropertyOptional({ description: 'Filter by project status (exact match, e.g. "Issuing")' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Filter by policy topic ID (exact match) — returns all projects under the same Guardian policy' })
    @IsOptional()
    @IsString()
    policyTopicId?: string;
}

export class ProjectResponseDto {
    @ApiProperty({ description: 'Internal row identifier' })
    id: string;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({ nullable: true, description: 'Project display name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Country where the project is located' })
    country: string | null;

    @ApiProperty({ nullable: true, description: 'Latitude of the project location' })
    lat: number | null;

    @ApiProperty({ nullable: true, description: 'Longitude of the project location' })
    lng: number | null;

    @ApiProperty({ nullable: true, description: 'Associated methodology name' })
    methodology: string | null;

    @ApiProperty({ nullable: true, description: 'URL-safe slug derived from the methodology name' })
    methodologyId: string | null;

    @ApiProperty({ nullable: true, description: 'DID of the publishing Standard Registry' })
    registryDid: string | null;

    @ApiProperty({ nullable: true, description: 'Display name of the publishing Standard Registry' })
    registryName: string | null;

    @ApiProperty({ nullable: true, description: 'Project developer / owner name' })
    developer: string | null;

    @ApiProperty({ nullable: true, description: 'Accumulated emission reduction credits (ER_y)' })
    credits: number | null;

    @ApiProperty({ nullable: true, description: 'Project status (e.g. "Issuing")' })
    status: string | null;

    @ApiProperty({ nullable: true, description: 'Vintage year derived from the project start date' })
    vintage: string | null;

    @ApiProperty({ type: [Number], description: 'Sustainable Development Goal numbers associated with this project' })
    sdgs: number[];

    @ApiProperty({ nullable: true, description: 'Co-benefits description' })
    cobenefits: string | null;

    @ApiProperty({ nullable: true, description: 'Project category' })
    category: string | null;

    @ApiProperty({ nullable: true, description: 'Project sector' })
    sector: string | null;

    @ApiProperty({ nullable: true, description: 'Sectoral scope designation' })
    sectoralScope: string | null;

    @ApiProperty({ nullable: true, description: 'Project creation / start date (ISO string or year)' })
    createdAt: string | null;

    @ApiProperty({ nullable: true, description: 'Hedera topic ID of the first project VC' })
    topicId: string | null;

    @ApiProperty({ nullable: true, description: 'Hedera policy topic ID (parent of the instance topic)' })
    policyTopicId: string | null;

    @ApiProperty({ description: 'Number of VC-Document messages that contributed to this project row' })
    vcCount: number;

    @ApiProperty({ description: 'HCS consensus timestamp of the earliest source VC message' })
    sourceTimestamp: string;

    @ApiProperty({ description: 'Last time this row was written to the database' })
    updatedAt: Date;

    @ApiProperty({ type: [IssuanceDto], description: 'Linked token issuances for this project' })
    issuances: IssuanceDto[];

    static fromRow(row: ProjectRow, network: string): ProjectResponseDto {
        const data = (row.businessData ?? {}) as Record<string, unknown>;

        return {
            id: row.id,
            network,
            name: row.displayName,
            country: typeof data['country'] === 'string' ? data['country'] : null,
            lat: typeof data['lat'] === 'number' ? data['lat'] : null,
            lng: typeof data['lng'] === 'number' ? data['lng'] : null,
            methodology: typeof data['methodology'] === 'string' ? data['methodology'] : null,
            methodologyId: typeof data['methodologyId'] === 'string' ? data['methodologyId'] : null,
            registryDid: row.registryDid,
            registryName: row.registryName,
            developer: typeof data['developer'] === 'string' ? data['developer'] : null,
            credits: typeof data['credits'] === 'number' ? data['credits'] : null,
            status: typeof data['status'] === 'string' ? data['status'] : null,
            vintage: typeof data['vintage'] === 'string' ? data['vintage'] : null,
            sdgs: Array.isArray(data['sdgs']) ? (data['sdgs'] as number[]) : [],
            cobenefits: typeof data['cobenefits'] === 'string' ? data['cobenefits'] : null,
            category: typeof data['category'] === 'string' ? data['category'] : null,
            sector: typeof data['sector'] === 'string' ? data['sector'] : null,
            sectoralScope: typeof data['sectoralScope'] === 'string' ? data['sectoralScope'] : null,
            createdAt: typeof data['createdAt'] === 'string' ? data['createdAt'] : null,
            topicId: typeof data['topicId'] === 'string' ? data['topicId'] : null,
            policyTopicId: typeof data['policyTopicId'] === 'string' ? data['policyTopicId'] : null,
            vcCount: typeof data['vcCount'] === 'number' ? data['vcCount'] : 0,
            sourceTimestamp: row.sourceTimestamp,
            updatedAt: row.updatedAt,
            issuances: (row.issuances ?? []).map(i => ({
                tokenId: i.tokenId,
                name: i.name,
                symbol: i.symbol,
                type: i.type,
                supply: i.supply,
                mintDate: i.mintDate,
            })),
        };
    }
}

export class PaginatedProjectsDto {
    @ApiProperty({ type: [ProjectResponseDto] })
    data: ProjectResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}
