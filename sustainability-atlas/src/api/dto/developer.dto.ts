import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';
import { DeveloperRow } from '../repositories/developer.repository';

export class DeveloperQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by HQ country (partial match)' })
    @IsOptional()
    @IsString()
    country?: string;
}

export class DeveloperResponseDto {
    @ApiProperty({ description: 'Slug derived from developer name (used as id)' })
    id: string;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({ description: 'Developer name' })
    name: string;

    @ApiProperty({ nullable: true, description: 'Most common country across the developer\'s projects' })
    country: string | null;

    @ApiProperty({ description: 'Number of distinct countries across the developer\'s projects' })
    countries: number;

    @ApiProperty({ description: 'Number of projects' })
    projects: number;

    @ApiProperty({ type: [String], description: 'Distinct registry display names' })
    registries: string[];

    @ApiProperty({ type: [String], description: 'Distinct project categories' })
    categories: string[];

    @ApiProperty({ description: 'Total credits ever minted across the developer\'s projects (project_mint_link)' })
    totalIssued: number;

    @ApiProperty({ description: 'Total credits retired across the developer\'s projects (nft_cache deleted=true)' })
    totalRetired: number;

    static fromRow(row: DeveloperRow, network: string): DeveloperResponseDto {
        return {
            id: slug(row.name),
            network,
            name: row.name,
            country: row.country,
            countries: row.countries,
            projects: row.projects,
            registries: row.registries,
            categories: row.categories,
            totalIssued: row.totalIssued,
            totalRetired: row.totalRetired,
        };
    }
}

export class PaginatedDevelopersDto {
    @ApiProperty({ type: [DeveloperResponseDto] })
    data: DeveloperResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };
}

function slug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
