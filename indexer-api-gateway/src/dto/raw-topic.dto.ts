import { RawTopic } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class RawTopicDTO implements RawTopic {
    @ApiProperty({
        description: 'Identifier',
        example: '667c240639282050117a1985',
    })
    _id: string;
    @ApiProperty({
        description: 'Identifier',
        example: '667c240639282050117a1985',
    })
    id: string;
    @ApiProperty({
        description: 'Topic identifier',
        example: '0.0.4481265',
    })
    topicId: string;
    @ApiProperty({
        description: 'Status',
    })
    status: string;
    @ApiProperty({
        description: 'Last update',
        example: 1716755852055,
    })
    lastUpdate: number;
    @ApiProperty({
        description: 'Messages',
        example: 25,
    })
    messages: number;
    @ApiProperty({
        description: 'Has next',
        example: false,
    })
    hasNext: boolean;
}
