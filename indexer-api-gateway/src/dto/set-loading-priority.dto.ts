import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class SetLoadingPriorityDTO {
    @ApiProperty({
        description: 'Topic Ids',
        example: ['0.0.1'],
    })
    @IsArray()
    ids: string[];
}
