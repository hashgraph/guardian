import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { EntityStatus } from '@guardian/interfaces';
import { SchemaDTO } from './schemas.dto.js';
import { PolicyDTO } from './policies.dto.js';
import { VcDocumentDTO, VpDocumentDTO } from './document.dto.js';
import { StatisticDefinitionDTO } from './policy-statistics.dto.js';

export class PolicyLabelDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    id?: string;

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
        required: true,
        example: 'Tool name'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    creator?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

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
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    policyTopicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    policyInstanceTopicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        enum: EntityStatus,
        example: EntityStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: EntityStatus;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        nullable: true,
    })
    @IsOptional()
    @IsObject()
    config?: any;
}

@ApiExtraModels(PolicyDTO, SchemaDTO)
export class PolicyLabelRelationshipsDTO {
    @ApiProperty({
        type: () => PolicyDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    policy?: PolicyDTO;

    @ApiProperty({
        type: () => SchemaDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    policySchemas?: SchemaDTO[];

    @ApiProperty({
        type: () => SchemaDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    documentsSchemas?: SchemaDTO[];
}

export class PolicyLabelDocumentDTO {
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
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    definitionId?: string;

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
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    policyTopicId: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    policyInstanceTopicId: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    creator?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    target: string;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [Examples.MESSAGE_ID]
    })
    @IsOptional()
    @IsArray()
    relationships?: string[];

    @ApiProperty({
        type: 'object',
        nullable: true,
        additionalProperties: true
    })
    @IsOptional()
    @IsObject()
    document?: any;
}

@ApiExtraModels(VpDocumentDTO, VcDocumentDTO)
export class PolicyLabelDocumentRelationshipsDTO {
    @ApiProperty({
        type: () => VpDocumentDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    target?: VpDocumentDTO;

    @ApiProperty({
        type: () => VcDocumentDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    relationships?: VcDocumentDTO[];
}

@ApiExtraModels(VpDocumentDTO, StatisticDefinitionDTO)
export class PolicyLabelComponentsDTO {
    @ApiProperty({
        type: () => StatisticDefinitionDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    statistics?: StatisticDefinitionDTO[];

    @ApiProperty({
        type: () => PolicyLabelDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    labels?: PolicyLabelDTO[];
}

export class PolicyLabelFiltersDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Name'
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        description: 'Component type',
        enum: ['all', 'label', 'statistic'],
        example: 'all'
    })
    @IsOptional()
    @IsString()
    components?: 'all' | 'label' | 'statistic';
}
