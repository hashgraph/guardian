import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { BlockDTO, ValidationErrorsDTO } from './blocks.js';
import { IsString } from 'class-validator';

@ApiExtraModels(BlockDTO)
export class ToolDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Tool name'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    description?: string;

    @ApiProperty({
        type: 'string',
        enum: [
            'DRAFT',
            'PUBLISHED',
            'PUBLISH_ERROR'
        ],
        example: 'NEW'
    })
    status?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    creator?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    owner?: string;

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
        example: '1.0.0'
    })
    codeVersion?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: () => BlockDTO,
        required: true,
    })
    config: BlockDTO;

    @ApiProperty({
        type: 'string',
        example: '1.0.0'
    })
    version?: string;
}

@ApiExtraModels(ToolDTO)
export class ToolPreviewDTO {
    @ApiProperty({
        type: () => ToolDTO
    })
    tool: ToolDTO;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
    })
    schemas?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
    })
    tags?: any[];

    @ApiProperty({
        type: () => ToolDTO,
        isArray: true
    })
    tools: ToolDTO[];
}

@ApiExtraModels(ToolDTO, ValidationErrorsDTO)
export class ToolValidationDTO {
    @ApiProperty({
        type: () => ToolDTO
    })
    tool: ToolDTO;

    @ApiProperty({
        type: () => ValidationErrorsDTO
    })
    results: ValidationErrorsDTO;
}

export class ToolVersionDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: '1.0.0'
    })
    @IsString()
    toolVersion: string;
}