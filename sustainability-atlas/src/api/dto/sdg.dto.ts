import { ApiProperty } from '@nestjs/swagger';
import { SdgStatsRow } from '../repositories/sdg.repository';

/**
 * Catalogue of UN Sustainable Development Goals. Kept on the API side so
 * clients receive complete rows (name + colour) even for SDGs that have
 * zero projects on a given network.
 */
const SDG_CATALOGUE: Array<{ id: number; name: string; color: string }> = [
    { id: 1,  name: 'No Poverty', color: '#E5243B' },
    { id: 2,  name: 'Zero Hunger', color: '#DDA63A' },
    { id: 3,  name: 'Good Health and Well-being', color: '#4C9F38' },
    { id: 4,  name: 'Quality Education', color: '#C5192D' },
    { id: 5,  name: 'Gender Equality', color: '#FF3A21' },
    { id: 6,  name: 'Clean Water and Sanitation', color: '#26BDE2' },
    { id: 7,  name: 'Affordable and Clean Energy', color: '#FCC30B' },
    { id: 8,  name: 'Decent Work and Economic Growth', color: '#A21942' },
    { id: 9,  name: 'Industry, Innovation and Infrastructure', color: '#FD6925' },
    { id: 10, name: 'Reduced Inequalities', color: '#DD1367' },
    { id: 11, name: 'Sustainable Cities and Communities', color: '#FD9D24' },
    { id: 12, name: 'Responsible Consumption and Production', color: '#BF8B2E' },
    { id: 13, name: 'Climate Action', color: '#3F7E44' },
    { id: 14, name: 'Life Below Water', color: '#0A97D9' },
    { id: 15, name: 'Life on Land', color: '#56C02B' },
    { id: 16, name: 'Peace, Justice and Strong Institutions', color: '#00689D' },
    { id: 17, name: 'Partnerships for the Goals', color: '#19486A' },
];

export class SdgStatsResponseDto {
    @ApiProperty({ description: 'SDG number (1–17)' })
    id: number;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({ description: 'Official SDG name' })
    name: string;

    @ApiProperty({ description: 'Official SDG accent colour (hex)' })
    color: string;

    @ApiProperty({ description: 'Number of projects tagged with this SDG' })
    projects: number;

    @ApiProperty({ description: 'Total credits (ER_y) summed across projects tagged with this SDG' })
    credits: number;

    @ApiProperty({ description: 'Number of distinct developers across projects tagged with this SDG' })
    developers: number;

    @ApiProperty({ description: 'Number of distinct countries across projects tagged with this SDG' })
    countries: number;

    @ApiProperty({ nullable: true, description: 'Methodology with the most projects under this SDG' })
    topMethodology: string | null;
}

export class SdgStatsListResponseDto {
    @ApiProperty({ type: [SdgStatsResponseDto] })
    data: SdgStatsResponseDto[];

    @ApiProperty({ description: 'Total number of PROJECT rows on this network (denominator for coverage %)' })
    totalProjects: number;
}

/**
 * Merges DB aggregate rows with the static SDG catalogue so the response
 * always carries 17 entries, even for SDGs no project has tagged yet.
 */
export function buildSdgStatsList(
    rows: SdgStatsRow[],
    totalProjects: number,
    network: string,
): SdgStatsListResponseDto {
    const byId = new Map<number, SdgStatsRow>();
    for (const r of rows) byId.set(r.sdgId, r);

    const data: SdgStatsResponseDto[] = SDG_CATALOGUE.map(sdg => {
        const stats = byId.get(sdg.id);
        return {
            id: sdg.id,
            network,
            name: sdg.name,
            color: sdg.color,
            projects: stats?.projects ?? 0,
            credits: stats?.credits ?? 0,
            developers: stats?.developers ?? 0,
            countries: stats?.countries ?? 0,
            topMethodology: stats?.topMethodology ?? null,
        };
    });

    return { data, totalProjects };
}
