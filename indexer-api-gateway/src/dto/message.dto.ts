import { Message, MessageAction, MessageType } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class MessageDTO<O = any, A = any> implements Message<O, A> {
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
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    consensusTimestamp: string;
    @ApiProperty({
        description: 'Owner',
        example: '0.0.1',
    })
    owner: string;
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Status',
        example: 'NEW',
    })
    status: string;
    @ApiProperty({
        description: 'Status',
        example: 'Revoked',
    })
    statusReason: string;
    // @ApiProperty({
    //     description: 'Type',
    //     example: 'VC-Document',
    // })
    type: MessageType;
    // @ApiProperty({
    //     description: 'Type',
    //     example: 'create-vc-document',
    // })
    action: MessageAction;
    @ApiProperty({
        description: 'Lang',
        example: 'en-US',
    })
    lang: string;
    @ApiProperty({
        description: 'Response type',
        example: 'str',
    })
    responseType: string;
    @ApiProperty({
        description: 'Status message',
    })
    statusMessage: string;
    @ApiProperty({
        description: 'Status owner',
    })
    statusOwner: string;
    options: O;
    analytics?: A;
    @ApiProperty({
        description: 'Files',
        example: ['QmYtKEVfpbDwn7XLHjnjap224ESi3vLiYpkbWoabnxs6cX'],
    })
    files: string[];
    // @ApiProperty({
    //     description: 'Documents',
    //     type: 'array',
    //     items: {
    //         type: 'string',
    //     },
    //     example: ['667c240639282050117a1985']
    // })
    documents: any[];
    @ApiProperty({
        description: 'Topics',
        example: ['0.0.4481265'],
    })
    topics: string[];
    @ApiProperty({
        description: 'Tokens',
        example: ['0.0.4481265'],
    })
    tokens: string[];
    @ApiProperty({
        description: 'SequenceNumber',
        example: 0,
    })
    sequenceNumber?: number;
}
