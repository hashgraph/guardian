import { LandingAnalytics } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Landing Analytics DTO
 */
export class LandingAnalyticsDTO implements LandingAnalytics {
    @ApiProperty({
        description: 'Registries count',
        example: '10',
    })
    registries: number;

    @ApiProperty({
        description: 'Methodologies count',
        example: '10',
    })
    methodologies: number;

    @ApiProperty({
        description: 'Projects count',
        example: '10',
    })
    projects: number;

    @ApiProperty({
        description: 'Total issuance',
        example: '10',
    })
    totalIssuance: number;

    @ApiProperty({
        description: 'ISO Date',
        example: '2024-06-12T14:17:26.689Z'
    })
    date: Date;
}
