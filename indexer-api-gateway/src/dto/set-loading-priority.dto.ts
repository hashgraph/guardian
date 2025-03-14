import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetLoadingPriorityDTO {
    @ApiProperty({
        description: 'Topic Id',
        example: '0.0.1',
    })
    @IsString()
    topicId: string;
}
