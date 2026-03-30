import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { BlockDTO, ValidationErrorsDTO } from './blocks.js';
import { IsString } from 'class-validator';

@ApiExtraModels(BlockDTO)
export class ToolDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Unique universal identifier of the tool',
        required: true,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable name of the tool',
        required: true,
        example: 'Tool 05'
    })
    name: string;

    @ApiProperty({
        type: String,
        description: 'Tool description',
        example: 'Automated GHG emission calculation tool'
    })
    description?: string;

    @ApiProperty({
        type: String,
        description: 'Tool lifecycle status',
        enum: [
            'DRAFT',
            'PUBLISHED',
            'PUBLISH_ERROR'
        ],
        example: 'DRAFT'
    })
    status?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the user who created the tool',
        example: Examples.DID
    })
    creator?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the tool owner',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera topic ID associated with the tool',
        example: Examples.ACCOUNT_ID
    })
    topicId?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera message ID for the published tool',
        example: Examples.MESSAGE_ID
    })
    messageId?: string;

    @ApiProperty({
        type: String,
        description: 'Guardian code version used to create the tool',
        example: '1.5.1'
    })
    codeVersion?: string;

    @ApiProperty({
        type: String,
        description: 'Tool creation date in ISO 8601 format',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: () => BlockDTO,
        description: 'Tool block configuration tree',
        required: true,
    })
    config: BlockDTO;

    @ApiProperty({
        type: String,
        description: 'Published version of the tool',
        example: '1.0.0'
    })
    version?: string;
}

@ApiExtraModels(ToolDTO)
export class ToolPreviewDTO {
    @ApiProperty({
        type: () => ToolDTO,
        description: 'Tool configuration'
    })
    tool: ToolDTO;

    @ApiProperty({
        type: 'object',
        description: 'Schemas used by the tool',
        additionalProperties: true,
        isArray: true,
    })
    schemas?: any[];

    @ApiProperty({
        type: 'object',
        description: 'Tags associated with the tool',
        additionalProperties: true,
        isArray: true,
    })
    tags?: any[];

    @ApiProperty({
        type: () => ToolDTO,
        description: 'Sub-tools used by this tool',
        isArray: true
    })
    tools: ToolDTO[];
}

@ApiExtraModels(ToolDTO, ValidationErrorsDTO)
export class ToolValidationDTO {
    @ApiProperty({
        type: () => ToolDTO,
        description: 'Tool configuration'
    })
    tool: ToolDTO;

    @ApiProperty({
        type: () => ValidationErrorsDTO,
        description: 'Validation results'
    })
    results: ValidationErrorsDTO;
}

export class ToolVersionDTO {
    @ApiProperty({
        type: String,
        description: 'Version string for the tool (semver format)',
        required: true,
        example: '1.0.0'
    })
    @IsString()
    toolVersion: string;
}
