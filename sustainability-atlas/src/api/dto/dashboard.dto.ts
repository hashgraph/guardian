import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardMintStatsQueryDto {
    @ApiPropertyOptional({ description: 'Filter by registry display name' })
    @IsOptional()
    @IsString()
    registry?: string;

    @ApiPropertyOptional({ description: 'Filter by project developer name' })
    @IsOptional()
    @IsString()
    developer?: string;
}

export class MintSeriesEntryDto {
    @ApiProperty({ description: 'Month bucket as ISO date (YYYY-MM-01)' })
    month: string;

    @ApiProperty({ description: 'Total minted in this month (tCO2e or token units)' })
    amount: number;
}

export class MintBreakdownEntryDto {
    @ApiProperty({ description: 'Sector or registry label' })
    label: string;

    @ApiProperty({ description: 'Total minted for this label' })
    amount: number;
}

export class DashboardMintStatsDto {
    @ApiProperty({ description: 'Sum of all project_mint_link amounts connected to projects' })
    totalMinted: number;

    @ApiProperty({ type: [MintSeriesEntryDto], description: 'Monthly minted amounts, sorted ascending' })
    mintSeries: MintSeriesEntryDto[];

    @ApiProperty({ type: [MintBreakdownEntryDto], description: 'Minted amounts grouped by project sector' })
    bySector: MintBreakdownEntryDto[];

    @ApiProperty({ type: [MintBreakdownEntryDto], description: 'Minted amounts grouped by registry' })
    byRegistry: MintBreakdownEntryDto[];
}
