import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class PolicyFiltersDTO {
    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1],
        required: false,
        example: 0
    })
    @IsOptional()
    idLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1],
        required: false,
        example: 0
    })
    @IsOptional()
    eventsLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1, 2],
        required: false,
        example: 0
    })
    @IsOptional()
    propLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1, 2],
        required: false,
        example: 0
    })
    @IsOptional()
    childrenLvl?: number | string;
}
