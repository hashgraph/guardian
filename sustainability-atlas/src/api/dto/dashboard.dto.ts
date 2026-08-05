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

    @ApiPropertyOptional({ description: 'Filter by publishing registry DID (exact match)' })
    @IsOptional()
    @IsString()
    registryDid?: string;
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

export class DashboardTotalsDto {
    @ApiProperty({ description: 'System-wide deduplicated registry count (non-empty registries only)' })
    registries: number;

    @ApiProperty({ description: 'System-wide deduplicated methodology count' })
    methodologies: number;

    @ApiProperty({ description: 'Project count matching the active filters' })
    projects: number;

    @ApiProperty({ description: 'Distinct registries within the filtered project set' })
    filteredRegistries: number;

    @ApiProperty({ description: 'Distinct methodologies within the filtered project set' })
    filteredMethodologies: number;
}

export class PortfolioMetricsDto {
    @ApiProperty({ description: 'Credits issued across the filtered project set' })
    totalIssued: number;

    @ApiProperty({ description: 'Credits retired across the filtered project set' })
    totalRetired: number;

    @ApiProperty({ description: 'Issued minus retired' })
    totalActive: number;

    @ApiProperty({ nullable: true, description: 'Mean vintage year (restricted to 2000-2030)' })
    avgVintageYear: number | null;

    @ApiProperty({ nullable: true, description: 'Mean crediting-period length in years' })
    avgCreditingPeriodYears: number | null;
}

export class DashboardFilterOptionsDto {
    @ApiProperty({ type: [String], description: 'All developer names, ignoring active filters' })
    developers: string[];

    @ApiProperty({ type: [String], description: 'All registry names, ignoring active filters' })
    registries: string[];
}

export class CountryAggregateDto {
    @ApiProperty({ description: 'Raw country string as stored on the project', nullable: true })
    country: string | null;

    @ApiProperty({ description: 'Number of projects in this country' })
    projects: number;

    @ApiProperty({ description: 'Sum of issued credits for those projects' })
    credits: number;

    @ApiProperty({ description: 'Distinct methodologies used by those projects' })
    methodologies: number;

    @ApiProperty({ description: 'A representative developer for the country row', nullable: true })
    developer: string | null;

    @ApiProperty({ description: 'A representative registry for the country row', nullable: true })
    registry: string | null;
}

export class LabelCountDto {
    @ApiProperty({ description: 'Group label (sector, vintage or registry name)', nullable: true })
    label: string | null;

    @ApiProperty({ description: 'Number of projects in this group' })
    projectCount: number;

    @ApiProperty({ description: 'Sum of issued credits for this group' })
    credits: number;

    @ApiProperty({ description: 'Distinct methodologies in this group' })
    methodologies: number;
}

export class CountryBreakdownDto {
    @ApiProperty({ nullable: true, description: 'Raw country string this bucket belongs to' })
    country: string | null;

    @ApiProperty({ nullable: true, description: 'Category or registry label' })
    label: string | null;

    @ApiProperty()
    projectCount: number;

    @ApiProperty()
    credits: number;
}

export class DeveloperAggregateDto {
    @ApiProperty({ nullable: true })
    label: string | null;

    @ApiProperty()
    projectCount: number;

    @ApiProperty()
    credits: number;

    @ApiProperty({ description: 'Distinct countries this developer operates in' })
    countryCount: number;

    @ApiProperty({ description: 'Distinct sectors this developer operates in' })
    sectorCount: number;
}

export class RegistryStatusCellDto {
    @ApiProperty({ nullable: true })
    registry: string | null;

    @ApiProperty({ nullable: true })
    status: string | null;

    @ApiProperty()
    projectCount: number;
}

export class MapPointDto {
    @ApiProperty({ nullable: true })
    name: string | null;

    @ApiProperty()
    lat: number;

    @ApiProperty()
    lng: number;

    @ApiProperty()
    credits: number;
}

export class DashboardSummaryDto {
    @ApiProperty({ type: DashboardTotalsDto })
    totals: DashboardTotalsDto;

    @ApiProperty({ type: DashboardFilterOptionsDto })
    filterOptions: DashboardFilterOptionsDto;

    @ApiProperty({ type: [CountryAggregateDto] })
    countries: CountryAggregateDto[];

    @ApiProperty({ type: [LabelCountDto], description: 'Projects grouped by registry display name' })
    registries: LabelCountDto[];

    @ApiProperty({ type: [LabelCountDto], description: 'Projects grouped by sector' })
    sectors: LabelCountDto[];

    @ApiProperty({ type: [LabelCountDto], description: 'Projects grouped by vintage year' })
    vintages: LabelCountDto[];

    @ApiProperty({ type: [CountryBreakdownDto], description: 'Per-country category buckets for the country detail panel' })
    countrySectors: CountryBreakdownDto[];

    @ApiProperty({ type: [CountryBreakdownDto], description: 'Per-country registry buckets for the country detail panel' })
    countryRegistries: CountryBreakdownDto[];

    @ApiProperty({ type: [LabelCountDto], description: 'Projects grouped by the stored status field' })
    statuses: LabelCountDto[];

    @ApiProperty({
        type: [LabelCountDto],
        description: 'Projects grouped by derived lifecycle stage: Registered | Validation | Monitoring | Verified | Issued',
    })
    lifecycleStages: LabelCountDto[];

    @ApiProperty({ type: [LabelCountDto], description: 'Projects grouped by methodology name' })
    methodologies: LabelCountDto[];

    @ApiProperty({ type: PortfolioMetricsDto })
    portfolio: PortfolioMetricsDto;

    @ApiProperty({ type: [DeveloperAggregateDto], description: 'Developer leaderboard rows' })
    developers: DeveloperAggregateDto[];

    @ApiProperty({ type: [RegistryStatusCellDto], description: '(registry, status) cross-tab' })
    registryStatuses: RegistryStatusCellDto[];

    @ApiProperty({
        type: [MapPointDto],
        description:
            'Per-project map markers. Only projects that actually carry coordinates are ' +
            'returned, so this stays small (and is empty for datasets with no geo data).',
    })
    mapPoints: MapPointDto[];
}
