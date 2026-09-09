import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MintSeriesEntryDto } from './dashboard.dto';

export class PortfolioStatsRequestDto {
    @ApiProperty({
        type: [String],
        description: 'Project keys (credentialSubject.id) of the watchlisted projects to aggregate (max 200, matching the watchlist size cap)',
    })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(200)
    @IsString({ each: true })
    projectKeys: string[];
}

export class PortfolioProjectTotalDto {
    @ApiProperty({ description: 'Project key (credentialSubject.id)' })
    projectKey: string;

    @ApiProperty({ description: 'Total minted amount for this project' })
    amount: number;
}

export class PortfolioRecentIssuanceDto {
    @ApiProperty({ description: 'Project key (credentialSubject.id)' })
    projectKey: string;

    @ApiProperty({ nullable: true, description: 'Hedera token ID' })
    tokenId: string | null;

    @ApiProperty({ nullable: true, description: 'Minted amount for this event' })
    amount: number | null;

    @ApiProperty({ nullable: true, description: 'ISO date the mint occurred' })
    mintDate: string | null;
}

export class PortfolioStatsDto {
    @ApiProperty({ description: 'Sum of all project_mint_link amounts across the given project keys' })
    totalMinted: number;

    @ApiProperty({ type: [PortfolioProjectTotalDto], description: 'Minted amount per project key' })
    byProjectKey: PortfolioProjectTotalDto[];

    @ApiProperty({ type: [MintSeriesEntryDto], description: 'Monthly minted amounts, sorted ascending' })
    mintSeries: MintSeriesEntryDto[];

    @ApiProperty({ type: [PortfolioRecentIssuanceDto], description: 'Most recent issuances, newest first' })
    recentIssuances: PortfolioRecentIssuanceDto[];
}
