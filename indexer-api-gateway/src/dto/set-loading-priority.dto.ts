import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetLoadingPriorityDTO {
    @ApiProperty({
        description: 'Topic Ids',
        example: ['0.0.1'],
    })
    @IsArray()
    topicIds: string[];
}
