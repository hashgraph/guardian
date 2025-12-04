import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class TagDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.UUID
    })
    uuid?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Tag label'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    description?: string;

    @ApiProperty({
        type: 'string',
        example: 'DID'
    })
    owner?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    date?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: [
            'Schema',
            'Policy',
            'Token',
            'Module',
            'Contract',
            'PolicyDocument'
        ],
        example: 'PolicyDocument'
    })
    entity: string;

    @ApiProperty({
        type: 'string',
        enum: [
            'Draft',
            'Published',
            'History'
        ],
        example: 'Published'
    })
    status?: string;

    @ApiProperty({
        type: 'string',
        enum: [
            'Create',
            'Delete'
        ],
        example: 'Create'
    })
    operation?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    topicId?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    messageId?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.IPFS
    })
    uri?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    target?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    localTarget: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true
    })
    document?: any;
}

@ApiExtraModels(TagDTO)
export class TagMapDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        enum: [
            'Schema',
            'Policy',
            'Token',
            'Module',
            'Contract',
            'PolicyDocument'
        ],
        example: 'PolicyDocument'
    })
    entity: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.MESSAGE_ID
    })
    target: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DATE
    })
    refreshDate: string;

    @ApiProperty({
        type: () => TagDTO,
        required: true,
        isArray: true,
    })
    tags: TagDTO[];
}

export class TagFilterDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        enum: [
            'Schema',
            'Policy',
            'Token',
            'Module',
            'Contract',
            'PolicyDocument',
            'PolicyBlock'
        ],
        example: 'PolicyDocument'
    })
    entity: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    target?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: Examples.MESSAGE_ID
    })
    targets?: string[];
}
