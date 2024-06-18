import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, Validate, IsOptional, IsObject, IsNumber } from 'class-validator';
import { Examples } from '../examples.js';
import { IsNumberOrString } from '../string-or-number.js';

class Options {
    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1],
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    idLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1],
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    eventsLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1, 2],
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    propLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1, 2],
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    childrenLvl?: number | string;
}

export class FilterPoliciesDTO extends Options {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId1?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId2?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: [
            Examples.DB_ID,
            Examples.DB_ID
        ]
    })
    @IsOptional()
    @IsArray()
    policyIds?: string[];


    @ApiProperty({
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['id', 'message', 'file']
            },
            value: {
                type: 'string'
            }
        },
        isArray: true,
        example: [{
            type: 'id',
            value: Examples.DB_ID
        }, {
            type: 'message',
            value: Examples.MESSAGE_ID
        }]
    })
    @IsOptional()
    @IsArray()
    policies?: {
        type: 'id' | 'file' | 'message',
        value: string
    }[];
}

export class FilterModulesDTO extends Options {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    moduleId1: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    moduleId2: string;
}

export class FilterSchemasDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    schemaId1: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    schemaId2: string;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'number' },
        ],
        enum: [0, 1],
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    idLvl?: number | string;
}

export class FilterDocumentsDTO extends Options {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    documentId1?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    documentId2?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: [
            Examples.DB_ID,
            Examples.DB_ID
        ]
    })
    @IsOptional()
    @IsArray()
    documentIds?: string[];
}

export class FilterToolsDTO extends Options {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    toolId1?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    toolId2?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: [
            Examples.DB_ID,
            Examples.DB_ID
        ]
    })
    @IsOptional()
    @IsArray()
    toolIds?: string[];
}

export class FilterSearchPoliciesDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: 'string',
        enum: [
            'Owned',
            'Local',
            'Global'
        ],
        example: 'Local'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'number',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    minVcCount?: number;

    @ApiProperty({
        type: 'number',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    minVpCount?: number;

    @ApiProperty({
        type: 'number',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    minTokensCount?: number;

    @ApiProperty({
        type: 'string',
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        type: 'number',
        minimum: 0,
        maximum: 100,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    threshold?: number;
}

export class FilterSearchBlocksDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.UUID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: 'object',
        required: true
    })
    @IsObject()
    config: any;
}