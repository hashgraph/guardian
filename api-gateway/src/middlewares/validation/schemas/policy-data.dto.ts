import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class PolicyDataPaginationDTO {
    @ApiProperty({ type: Number, example: 1 })
    page: number;

    @ApiProperty({ type: Number, example: 20 })
    pageSize: number;

    @ApiProperty({ type: Number, example: 1234 })
    total: number;

    @ApiProperty({ type: Number, example: 62 })
    totalPages: number;
}

export class PolicyDataQueryInfoDTO {
    @ApiProperty({ type: String, example: Examples.DB_ID })
    policyId: string;

    @ApiProperty({ type: String, example: '#MySchema' })
    schemaName: string;

    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
        example: { hederaStatus: { op: 'eq', value: 'ISSUE' } }
    })
    appliedFilters?: Record<string, unknown>;
}

export class PolicyDataQueryResponseDTO {
    @ApiProperty({
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Committed VC documents matching the query.',
    })
    data: object[];

    @ApiProperty({ type: () => PolicyDataPaginationDTO })
    pagination: PolicyDataPaginationDTO;

    @ApiProperty({ type: () => PolicyDataQueryInfoDTO })
    query: PolicyDataQueryInfoDTO;
}
