import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { PolicyType } from '@guardian/interfaces';
import { Examples } from '../examples.js';
import { ValidationErrorsDTO } from './blocks.js';

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
        enum: PolicyType,
        example: PolicyType.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: PolicyType;

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
        isArray: true
    })
    @IsOptional()
    @IsArray()
    schemas?: any[];

    @ApiProperty({
        type: 'object',
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