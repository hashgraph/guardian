import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import { PolicyAvailability, PolicyEditableFieldDTO, PolicyStatus, PolicyTestStatus } from '@guardian/interfaces';
import { Examples } from '../examples.js';
import { ValidationErrorsDTO } from './blocks.js';
import {Type} from 'class-transformer';

export class PolicyTestDTO {
    @ApiProperty({
        type: String,
        description: 'Test ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Test UUID',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: String,
        description: 'Test Name',
        example: 'Test Name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'Policy ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: String,
        description: 'Test owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'Test status',
        enum: PolicyTestStatus,
        example: PolicyTestStatus.New
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({
        type: String,
        description: 'Last start date',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    date?: string;

    @ApiProperty({
        type: String,
        description: 'Test duration',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    duration?: number;

    @ApiProperty({
        type: String,
        description: 'Test progress',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    progress?: number;

    @ApiProperty({
        type: String,
        description: 'Test result',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    resultId?: string;

    @ApiProperty({
        type: String,
        description: 'Test result',
    })
    @IsOptional()
    @IsObject()
    result?: any;
}

export class BasePolicyDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    name?: string;
}

export class PolicyToolDTO {
    @ApiProperty({
        type: String,
        example: 'Tool 33'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string | null;

    @ApiProperty({
        type: String,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: String,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;
}

export class PolicyImportantParametersDTO {
    @ApiProperty({
        type: String,
        required: false,
        example: ''
    })
    @IsOptional()
    @IsString()
    atValidation?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: ''
    })
    @IsOptional()
    @IsString()
    monitored?: string;
}

@ApiExtraModels(PolicyTestDTO, PolicyImportantParametersDTO)
export class PolicyDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: String,
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: String,
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    topicDescription?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: ''
    })
    @IsOptional()
    @IsString()
    applicabilityConditions?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: ''
    })
    @IsOptional()
    @IsString()
    detailsUrl?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: ''
    })
    @IsOptional()
    @IsString()
    typicalProjects?: string;

    @ApiProperty({
        type: () => PolicyImportantParametersDTO,
        required: false
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => PolicyImportantParametersDTO)
    importantParameters?: PolicyImportantParametersDTO;

    @ApiProperty({
        type: String,
        example: 'Tag'
    })
    @IsOptional()
    @IsString()
    policyTag?: string;

    @ApiProperty({
        type: String,
        enum: PolicyStatus,
        example: PolicyStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: PolicyStatus;

    @ApiProperty({
        type: String,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    creator?: string;

    @ApiProperty({
        type: String,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: String,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: String,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    instanceTopicId?: string;

    @ApiProperty({
        type: String,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: String,
        enum: PolicyAvailability,
        required: false,
        example: PolicyAvailability.PRIVATE
    })
    @IsOptional()
    @IsString()
    availability?: PolicyAvailability;

    @ApiProperty({
        type: String,
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    codeVersion?: string;

    @ApiProperty({
        type: () => PolicyToolDTO,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PolicyToolDTO)
    tools?: PolicyToolDTO[];

    @ApiProperty({
        type: String,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: String,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    originalChanged?: boolean;

    @ApiProperty({
        type: () => PolicyEditableFieldDTO,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PolicyEditableFieldDTO)
    editableParametersSettings?: PolicyEditableFieldDTO[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    config?: any;

    @ApiProperty({
        type: String,
        example: 'Installer'
    })
    @IsOptional()
    @IsString()
    userRole?: string;

    @ApiProperty({
        type: String,
        isArray: true,
        example: ['Installer']
    })
    @IsOptional()
    @IsArray()
    userRoles?: string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        nullable: true,
        description:
            'Last active group in iteration order (not a separate summary). Often shown via groupLabel or uuid.',
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
        description: 'Full list of group rows for this user in the policy (getGroupsByUser), including inactive.',
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
        type: String,
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
        type: 'object',
        additionalProperties: true,
        isArray: true,
        description: 'User-configured policy API documentation entries. The `alias` may be a single slug (`create-device`) or a path of slugs separated by `/` (`monitoring-reports/create`).',
        example: [{
            name: 'create_device',
            description: 'Send event to create_device',
            target: 'create_device',
            method: 'POST',
            alias: 'monitoring-reports/create',
            url: '/api/v1/policies/{policyId}/tag/create_device/blocks',
            dmrvUrl: '/api/v1/dmrv/{policyId}/monitoring-reports/create'
        }]
    })
    @IsOptional()
    @IsArray()
    policyDocumentation?: any[];

    @ApiProperty({
        type: String,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    categories?: string[];

    @ApiProperty({
        type: String,
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
        type: String,
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
        type: String,
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
        type: String,
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
        type: String,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Large-Scale'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'PROJECT_SCALE'
    })
    @IsString()
    type: string;
}

export class PolicyVersionDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: '1.0.0'
    })
    @IsString()
    policyVersion: string;

    @ApiProperty({
        type: String,
        required: false,
        enum: PolicyAvailability,
        example: 'private'
    })
    @IsString()
    @IsOptional()
    policyAvailability?: PolicyAvailability;

    @ApiProperty({
        type: Boolean,
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
        type: String,
        example: 'RunEvent'
    })
    @IsOptional()
    @IsString()
    input?: string;

    @ApiProperty({
        description: 'Output event',
        type: String,
        example: 'RunEvent'
    })
    @IsOptional()
    @IsString()
    output?: string;

    @ApiProperty({
        description: 'Document type',
        type: String,
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
        type: String,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    logs?: string[];

    @ApiProperty({
        description: 'Errors',
        type: String,
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
        type: String,
        description: 'History ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        description: 'Create date',
        type: String,
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
        type: String,
        isArray: true,
        required: true,
        example: [Examples.DB_ID]
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    savepointIds!: string[];

    @ApiProperty({
        type: Boolean,
        required: false,
        example: false,
        description:
            'If `false`, and the policy has more than one savepoint, the current savepoint cannot be deleted. ' +
            'If `true`, that guard is bypassed (used by the UI for deleting all savepoints).'
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
        type: String,
        isArray: true,
        required: true,
        example: [Examples.DB_ID]
    })
    @IsArray()
    @IsString({ each: true })
    hardDeletedIds!: string[];
}
