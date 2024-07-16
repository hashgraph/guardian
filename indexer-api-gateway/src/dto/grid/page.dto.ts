import { Page } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Landing Analytics DTO
 */
export class PageDTO<T> implements Page<T> {
    items: T[];
    @ApiProperty({
        description: 'Page index',
        example: '0',
    })
    pageIndex: number;
    @ApiProperty({
        description: 'Page size',
        example: '10',
    })
    pageSize: number;
    @ApiProperty({
        description: 'Total size',
        example: '100',
    })
    total: number;
    @ApiProperty({
        description: 'Order',
    })
    order?: { [field: string]: string };
}
