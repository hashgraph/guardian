import { ApiProperty } from '@nestjs/swagger';

export class PageDTO {
    @ApiProperty({ type: 'number', nullable: false, required: true })
    pageIndex: number;

    @ApiProperty({ type: 'number', nullable: false, required: true })
    pageSize: number;

    @ApiProperty({ type: 'number', nullable: false, required: true })
    total: number;

    @ApiProperty({ type: 'object', nullable: false, required: true, isArray: true })
    items: any[];
}
