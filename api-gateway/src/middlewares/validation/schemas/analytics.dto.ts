import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, Validate, IsOptional, IsObject, IsNumber } from 'class-validator';
import { Examples } from '../examples.js';
import { IsNumberOrString } from '../string-or-number.js';
import { PolicyStatus } from '@guardian/interfaces';
import { IsStringOrObject } from '../string-or-object.js';

class Options {
    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1'] },
            { type: 'number', enum: [0, 1] },
        ],
        required: false,
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    idLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1', '2'] },
            { type: 'number', enum: [0, 1, 2] },
        ],
        required: false,
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    eventsLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1', '2'] },
            { type: 'number', enum: [0, 1, 2] },
        ],
        required: false,
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    propLvl?: number | string;

    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1', '2'] },
            { type: 'number', enum: [0, 1, 2] },
        ],
        required: false,
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    childrenLvl?: number | string;
}

export class CompareFileDTO {
    @ApiProperty({
        type: 'string',
        description: 'File ID',
        required: true,
        example: Examples.UUID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: 'string',
        description: 'File Name',
        required: true,
        example: 'File Name',
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: 'string',
        description: 'Buffer',
        required: true,
        example: 'base64...'
    })
    @IsString()
    value: string;
}

@ApiExtraModels(CompareFileDTO)
export class FilterPolicyDTO {
    @ApiProperty({
        type: 'string',
        description: 'Identifier type',
        enum: ['id', 'message', 'file'],
        required: true,
        example: 'id'
    })
    @IsString()
    type: 'id' | 'file' | 'message';

    @ApiProperty({
        oneOf: [
            {
                type: 'string',
                description: 'Policy ID'
            },
            {
                type: 'string',
                description: 'Policy Message ID'
            },
            {
                $ref: getSchemaPath(CompareFileDTO),
                description: 'Policy File'
            },
        ],
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    value: string | CompareFileDTO;
}

@ApiExtraModels(FilterPolicyDTO)
export class FilterPoliciesDTO extends Options {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId1?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    policyId2?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false,
        example: [Examples.DB_ID, Examples.DB_ID_2]
    })
    @IsOptional()
    @IsArray()
    policyIds?: string[];

    @ApiProperty({
        type: () => FilterPolicyDTO,
        isArray: true,
        required: false,
        example: [{
            type: 'id',
            value: Examples.DB_ID
        }, {
            type: 'message',
            value: Examples.MESSAGE_ID
        }, {
            type: 'file',
            value: {
                id: Examples.UUID,
                name: 'File Name',
                value: 'base64...'
            }
        }]
    })
    @IsOptional()
    @IsArray()
    policies?: FilterPolicyDTO[];
}

export class CompareOriginalPolicyFilterDTO extends Options {
}

@ApiExtraModels(CompareFileDTO)
export class FilterSchemaDTO {
    @ApiProperty({
        type: 'string',
        description: 'Identifier type',
        enum: ['id', 'policy-message', 'policy-file'],
        required: true,
        example: 'id'
    })
    @IsString()
    type: 'id' | 'policy-message' | 'policy-file';

    @ApiProperty({
        type: 'string',
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    value: string;

    @ApiProperty({
        oneOf: [
            {
                description: 'Policy Message ID',
                type: 'string'
            },
            {
                $ref: getSchemaPath(CompareFileDTO),
                description: 'Policy File'
            },
        ],
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @Validate(IsStringOrObject)
    policy?: string | CompareFileDTO;
}

@ApiExtraModels(FilterSchemaDTO)
export class FilterSchemasDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    schemaId1?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    schemaId2?: string;

    @ApiProperty({
        type: () => FilterSchemaDTO,
        isArray: true,
        required: false,
        example: [{
            type: 'id',
            value: Examples.DB_ID
        }, {
            type: 'policy-message',
            value: Examples.UUID,
            policy: Examples.MESSAGE_ID
        }, {
            type: 'policy-file',
            value: Examples.UUID,
            policy: {
                id: Examples.UUID,
                name: 'File Name',
                value: 'base64...'
            }
        }]
    })
    @IsOptional()
    @IsArray()
    schemas?: FilterSchemaDTO[];

    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1'] },
            { type: 'number', enum: [0, 1] },
        ],
        required: false,
        example: 0
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    idLvl?: number | string;
}

export class CompareSchemasByIdsRequestDTO {
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
        example: Examples.DB_ID_2
    })
    @IsString()
    schemaId2: string;

    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1'] },
            { type: 'number', enum: [0, 1] },
        ],
        required: false,
        example: '0'
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    idLvl?: number | string;
}

export class CompareSchemasByListRequestDTO {
    @ApiProperty({
        type: () => FilterSchemaDTO,
        isArray: true,
        required: true,
        example: [{
            type: 'id',
            value: Examples.DB_ID
        }, {
            type: 'id',
            value: Examples.DB_ID_2
        }]
    })
    @IsArray()
    schemas: FilterSchemaDTO[];

    @ApiProperty({
        oneOf: [
            { type: 'string', enum: ['0', '1'] },
            { type: 'number', enum: [0, 1] },
        ],
        required: false,
        example: '0'
    })
    @IsOptional()
    @Validate(IsNumberOrString)
    idLvl?: number | string;
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
        example: Examples.DB_ID_2
    })
    @IsString()
    moduleId2: string;
}

export class FilterDocumentsDTO extends Options {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    documentId1?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    documentId2?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false,
        example: [
            Examples.DB_ID,
            Examples.DB_ID_2
        ]
    })
    @IsOptional()
    @IsArray()
    documentIds?: string[];
}

export class CompareDocumentsByIdsRequestDTO extends Options {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    documentId1: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID_2
    })
    @IsString()
    documentId2: string;
}

export class CompareDocumentsByListRequestDTO extends Options {
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: true,
        example: [
            Examples.DB_ID,
            Examples.DB_ID_2,
            Examples.DB_ID_3
        ]
    })
    @IsArray()
    @ArrayMinSize(2)
    documentIds: string[];
}

export class FilterToolsDTO extends Options {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    toolId1?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    toolId2?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false,
        example: [
            Examples.DB_ID,
            Examples.DB_ID_2
        ]
    })
    @IsOptional()
    @IsArray()
    toolIds?: string[];
}

export class CompareToolsByIdsRequestDTO extends Options {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    toolId1: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID_2
    })
    @IsString()
    toolId2: string;
}

export class CompareToolsByListRequestDTO extends Options {
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: true,
        example: [
            Examples.DB_ID,
            Examples.DB_ID_2,
            Examples.DB_ID_3
        ]
    })
    @IsArray()
    @ArrayMinSize(2)
    toolIds: string[];
}

export class FilterSearchPoliciesDTO {
    @ApiProperty({
        type: 'string',
        required: false,
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
        required: false,
        example: 'Local'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    minVcCount?: number;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    minVpCount?: number;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    minTokensCount?: number;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        type: 'number',
        minimum: 0,
        maximum: 100,
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    threshold?: number;

    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false,
        example: [
            Examples.DB_ID,
            Examples.DB_ID
        ]
    })
    @IsOptional()
    @IsArray()
    toolMessageIds?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    toolName?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    toolVersion?: string;
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
        additionalProperties: {}
    })
    @IsObject()
    config: any;
}

export class SearchPolicyDTO {
    @ApiProperty({
        type: 'string',
        enum: [
            'Local',
            'Global',
        ],
        required: false,
        example: 'Local'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Policy description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: 'string',
        enum: PolicyStatus,
        required: false,
        example: PolicyStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: PolicyStatus;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    tags?: any[];

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    vcCount?: number;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    vpCount?: number;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    tokensCount?: number;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    rate?: number;
}

@ApiExtraModels(SearchPolicyDTO)
export class SearchPoliciesDTO {
    @ApiProperty({
        type: () => SearchPolicyDTO,
        required: false,
        nullable: true
    })
    @IsOptional()
    @IsObject()
    target?: SearchPolicyDTO | null;

    @ApiProperty({
        type: () => SearchPolicyDTO,
        required: true,
        isArray: true,
    })
    @IsArray()
    result: SearchPolicyDTO[];
}
