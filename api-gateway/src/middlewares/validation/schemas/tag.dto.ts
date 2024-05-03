import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

export class TagDTO {
    @ApiProperty({
        type: 'string',
        example: '00000000-0000-0000-0000-000000000000'
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
        example: '1900-01-01T00:00:00.000Z'
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
        example: '0.0.0000000'
    })
    topicId?: string;

    @ApiProperty({
        type: 'string',
        example: '0000000000.000000000'
    })
    messageId?: string;

    @ApiProperty({
        type: 'string',
        example: 'DB ID'
    })
    policyId?: string;

    @ApiProperty({
        type: 'string',
        example: 'Document URI'
    })
    uri?: string;

    @ApiProperty({
        type: 'string',
        example: '0000000000.000000000'
    })
    target?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'DB ID'
    })
    localTarget: string;

    @ApiProperty({
        type: 'object'
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
        example: '0000000000.000000000'
    })
    target: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: '1900-01-01T00:00:00.000Z'
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
            'PolicyDocument'
        ],
        example: 'PolicyDocument'
    })
    entity: string;

    @ApiProperty({
        type: 'string',
        example: '0000000000.000000000'
    })
    target?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: '0000000000.000000000'
    })
    targets?: string[];
}