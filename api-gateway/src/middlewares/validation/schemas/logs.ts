import { ApiProperty } from '@nestjs/swagger';

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

    @ApiProperty({ type: 'object', isArray: true })
    logs?: any[];
}
