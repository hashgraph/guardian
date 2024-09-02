import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class StatisticsDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    uuid?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Tool name'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Description'
    })
    description?: string;
}