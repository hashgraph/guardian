import { ApiProperty } from '@nestjs/swagger';

export class SeqUrlResponseDTO {
    @ApiProperty({
        type: 'string',
        nullable: true,
        description: 'SEQ UI URL',
        example: 'http://localhost:5341'
    })
    // tslint:disable-next-line:variable-name
    seq_url: string | null;
}

export class LogFilterDTO {
    @ApiProperty({
        enum: ['INFO', 'WARN', 'ERROR'],
        nullable: true,
        description: 'Log severity filter. When empty, all logs are returned.'
    })
    type?: 'INFO' | 'WARN' | 'ERROR';

    @ApiProperty({
        type: 'string',
        format: 'date-time',
        nullable: true
    })
    startDate?: string;

    @ApiProperty({
        type: 'string',
        format: 'date-time',
        nullable: true
    })
    endDate?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        nullable: true
    })
    attributes?: string[];

    @ApiProperty({
        type: 'string',
        nullable: true
    })
    message?: string;

    @ApiProperty({
        type: 'number',
        nullable: true
    })
    pageSize?: number;

    @ApiProperty({
        type: 'number',
        nullable: true
    })
    pageIndex?: number;

    @ApiProperty({
        enum: ['asc', 'desc'],
        nullable: true,
        description: 'Sort order'
    })
    sortDirection?: 'asc' | 'desc';
}

export class LogItemDTO {
    @ApiProperty({
        type: 'string'
    })
    message: string;

    @ApiProperty({
        enum: ['INFO', 'WARN', 'ERROR']
    })
    type: 'INFO' | 'WARN' | 'ERROR';

    @ApiProperty({
        type: 'string',
        format: 'date-time'
    })
    datetime: string;

    @ApiProperty({
        type: 'string',
        isArray: true
    })
    attributes: string[];

    @ApiProperty({
        type: 'string',
        nullable: true
    })
    userId: string | null;

    @ApiProperty({
        type: 'string'
    })
    id: string;
}

export class LogResultDTO {
    @ApiProperty({
        type: 'number'
    })
    totalCount: number;

    @ApiProperty({
        type: LogItemDTO,
        isArray: true
    })
    logs: LogItemDTO[];
}
