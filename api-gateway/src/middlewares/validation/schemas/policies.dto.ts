import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import { PolicyAvailability, PolicyStatus, PolicyTestStatus } from '@guardian/interfaces';
import { Examples } from '../examples.js';
import { ValidationErrorsDTO } from './blocks.js';
import {Type} from 'class-transformer';

export class PolicyTestDTO {
    @ApiProperty({
        type: 'string',
        description: 'Test ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        description: 'Test UUID',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        description: 'Test Name',
        example: 'Test Name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Test owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        description: 'Test status',
        enum: PolicyTestStatus,
        example: PolicyTestStatus.New
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({
        type: 'string',
        description: 'Last start date',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    date?: string;

    @ApiProperty({
        type: 'string',
        description: 'Test duration',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    duration?: number;

    @ApiProperty({
        type: 'string',
        description: 'Test progress',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    progress?: number;

    @ApiProperty({
        type: 'string',
        description: 'Test result',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    resultId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Test result',
    })
    @IsOptional()
    @IsObject()
    result?: any;
}

@ApiExtraModels(PolicyTestDTO)
export class PolicyDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    topicDescription?: string;

    @ApiProperty({
        type: 'string',
        example: 'Tag'
    })
    @IsOptional()
    @IsString()
    policyTag?: string;

    @ApiProperty({
        type: 'string',
        enum: PolicyStatus,
        example: PolicyStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: PolicyStatus;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    creator?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    codeVersion?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: 'string',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    config?: any;

    @ApiProperty({
        type: 'string',
        example: 'Installer'
    })
    @IsOptional()
    @IsString()
    userRole?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: ['Installer']
    })
    @IsOptional()
    @IsArray()
    userRoles?: string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        example: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }
    })
    @IsOptional()
    @IsObject()
    userGroup?: any;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        example: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }]
    })
    @IsOptional()
    @IsArray()
    userGroups?: any[];

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: ['Registrant']
    })
    @IsOptional()
    @IsArray()
    policyRoles?: string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        example: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }]
    })
    @IsOptional()
    @IsArray()
    policyNavigation?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        example: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }]
    })
    @IsOptional()
    @IsArray()
    policyTopics?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        example: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }]
    })
    @IsOptional()
    @IsArray()
    policyTokens?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        example: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }]
    })
    @IsOptional()
    @IsArray()
    policyGroups?: any[];

    @ApiProperty({
        type: 'string',
        isArray: true
    })
    @IsOptional()
    @IsArray()
    categories?: string[];

    @ApiProperty({
        type: 'string',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    projectSchema?: string;

    @ApiProperty({
        type: () => PolicyTestDTO,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    tests?: PolicyTestDTO[];

    @ApiProperty({
        type: () => IgnoreRuleDTO,
        isArray: true,
        required: false,
        description: 'Validation-only rules to hide matching warnings/infos (not persisted)'
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IgnoreRuleDTO)
    ignoreRules?: IgnoreRuleDTO[];
}

@ApiExtraModels(PolicyDTO)
export class PolicyPreviewDTO {
    @ApiProperty({
        type: () => PolicyDTO,
        required: true
    })
    @IsObject()
    module: PolicyDTO;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @IsString()
    messageId: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    schemas?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    tags?: any[];

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    moduleTopicId?: string;
}

@ApiExtraModels(PolicyDTO)
export class PolicyValidationDTO {
    @ApiProperty({
        type: () => PolicyDTO,
        required: true
    })
    @IsObject()
    policy: PolicyDTO;

    @ApiProperty({
        type: () => ValidationErrorsDTO,
        required: true
    })
    @IsObject()
    results: ValidationErrorsDTO;
}

@ApiExtraModels(PolicyDTO)
export class PoliciesValidationDTO {
    @ApiProperty({
        type: () => PolicyDTO,
        isArray: true,
        required: true
    })
    @IsArray()
    policies: PolicyDTO[];

    @ApiProperty({
        type: 'string',
        required: true
    })
    @IsBoolean()
    isValid: boolean;

    @ApiProperty({
        type: () => ValidationErrorsDTO,
        required: true
    })
    @IsObject()
    errors: ValidationErrorsDTO;
}

export class PolicyCategoryDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Large-Scale'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'PROJECT_SCALE'
    })
    @IsString()
    type: string;
}

export class PolicyVersionDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: '1.0.0'
    })
    @IsString()
    policyVersion: string;

    @ApiProperty({
        type: 'string',
        required: false,
        enum: PolicyAvailability,
        example: 'private'
    })
    @IsString()
    @IsOptional()
    policyAvailability?: PolicyAvailability;

    @ApiProperty({
        type: 'boolean',
        required: false,
        example: false,
        description: 'Record policy actions',
    })
    @IsBoolean()
    @IsOptional()
    recordingEnabled?: boolean;
}

export class DebugBlockDataDTO {
    @ApiProperty({
        description: 'Input event',
        type: 'string',
        example: 'RunEvent'
    })
    @IsOptional()
    @IsString()
    input?: string;

    @ApiProperty({
        description: 'Output event',
        type: 'string',
        example: 'RunEvent'
    })
    @IsOptional()
    @IsString()
    output?: string;

    @ApiProperty({
        description: 'Document type',
        type: 'string',
        enum: ['schema', 'json', 'file', 'history'],
        example: 'json'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        description: 'Document',
        oneOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true }
        ]
    })
    @IsOptional()
    document?: any | string;
}

export class DebugBlockConfigDTO {
    @ApiProperty({
        description: 'Block config',
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    block?: any;

    @ApiProperty({
        description: 'Input data',
        type: () => DebugBlockDataDTO
    })
    @IsOptional()
    @IsObject()
    data: DebugBlockDataDTO;
}

export class DebugBlockResultDTO {
    @ApiProperty({
        description: 'Logs',
        type: 'string',
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    logs?: string[];

    @ApiProperty({
        description: 'Errors',
        type: 'string',
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    errors?: string[];

    @ApiProperty({
        description: 'Input documents',
        type: 'object',
        additionalProperties: true,
        isArray: true,
    })
    input?: any[];

    @ApiProperty({
        description: 'Output documents',
        type: 'object',
        additionalProperties: true,
        isArray: true,
    })
    output?: any[];
}

export class DebugBlockHistoryDTO {
    @ApiProperty({
        type: 'string',
        description: 'History ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        description: 'Create date',
        type: 'string',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        description: 'Input data',
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    document?: any;
}

export class IgnoreRuleDTO {
    @ApiPropertyOptional({description: 'Stable message code, e.g. DEPRECATION_BLOCK'})
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({description: 'Limit by block type'})
    @IsOptional()
    @IsString()
    blockType?: string;

    @ApiPropertyOptional({description: 'Limit by property'})
    @IsOptional()
    @IsString()
    property?: string;

    @ApiPropertyOptional({description: 'Substring filter applied to message text'})
    @IsOptional()
    @IsString()
    contains?: string;

    @ApiPropertyOptional({
        description: 'Type of message',
        enum: ['warning', 'info'],
    })
    @IsOptional()
    @IsIn(['warning', 'info'])
    severity?: 'warning' | 'info';
}

/**
 * Delete savepoints request body
 */
export class DeleteSavepointsDTO {
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: true,
        example: [Examples.DB_ID]
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    savepointIds!: string[];

    @ApiProperty({
        type: 'boolean',
        required: false,
        example: false,
        description: 'Skip protection for currently selected savepoint'
    })
    @IsOptional()
    @IsBoolean()
    skipCurrentSavepointGuard?: boolean;
}

/**
 * Delete savepoints response
 */
export class DeleteSavepointsResultDTO {
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: true,
        example: [Examples.DB_ID]
    })
    @IsArray()
    @IsString({ each: true })
    hardDeletedIds!: string[];
}
