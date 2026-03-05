import { ApiProperty } from '@nestjs/swagger';

export class SeqUrlResponseDTO {
    @ApiProperty({ type: 'string', nullable: true, description: 'SEQ UI URL', example: 'http://localhost:5341' })
    // tslint:disable-next-line:variable-name
    seq_url: string | null;
}

export class LogFilterDTO {
    @ApiProperty({ type: 'string', nullable: true })
    type?: string;

    @ApiProperty({ type: 'string', nullable: true })
    startDate?: string;

    @ApiProperty({ type: 'string', nullable: true })
    endDate?: string;

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    attributes?: string[];

    @ApiProperty({ type: 'string', nullable: true })
    message?: string;

    @ApiProperty({ type: 'number', nullable: true })
    pageSize?: number;

    @ApiProperty({ type: 'number', nullable: true })
    pageIndex?: number;

    @ApiProperty({ type: 'string', nullable: true })
    sortDirection?: string;
}

export class LogResultDTO {
    @ApiProperty({ type: 'number' })
    totalCount: number;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true
    })
    logs?: any[];
}
