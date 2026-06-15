import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Individual token issuance record within a project
 */
export class ProjectTokenIssuanceDTO {
    @ApiProperty({ description: 'Token identifier', example: '0.0.12345' })
    tokenId: string;

    @ApiProperty({ description: 'Token name', example: 'Carbon Credit Token' })
    tokenName: string;

    @ApiProperty({ description: 'Total amount minted (sum of all mint VCs)', example: 150000 })
    totalMinted: number;

    @ApiProperty({ description: 'Number of mint events', example: 12 })
    mintEventCount: number;

    @ApiPropertyOptional({ description: 'Most recent mint consensus timestamp', example: '1706823227.586179534' })
    lastMintTimestamp?: string;
}

/**
 * Project tonnage summary — aggregate mint data per policy project
 */
export class ProjectTonnageDTO {
    @ApiProperty({ description: 'Policy message identifier', example: '1706823227.586179534' })
    policyId: string;

    @ApiPropertyOptional({ description: 'Policy name', example: 'ACM0007 Methodology' })
    policyName?: string;

    @ApiPropertyOptional({ description: 'Registry DID or owner', example: 'did:hedera:mainnet:....' })
    owner?: string;

    @ApiProperty({ description: 'Total minted credits across all tokens', example: 500000 })
    totalMinted: number;

    @ApiProperty({ description: 'Total number of mint events', example: 42 })
    mintEventCount: number;

    @ApiProperty({ description: 'Token breakdown per token ID', type: [ProjectTokenIssuanceDTO] })
    tokens: ProjectTokenIssuanceDTO[];

    @ApiPropertyOptional({ description: 'Geography / coordinates if available', example: '33.33|77.77' })
    coordinates?: string;

    @ApiPropertyOptional({ description: 'Project description topic ID', example: '0.0.98765' })
    topicId?: string;
}

/**
 * Paginated response for project tonnage
 */
export class ProjectTonnagePageDTO {
    @ApiProperty({ description: 'List of projects with tonnage data', type: [ProjectTonnageDTO] })
    items: ProjectTonnageDTO[];

    @ApiProperty({ description: 'Total count of matching projects', example: 150 })
    total: number;

    @ApiProperty({ description: 'Current page index (0-based)', example: 0 })
    pageIndex: number;

    @ApiProperty({ description: 'Page size', example: 25 })
    pageSize: number;
}
