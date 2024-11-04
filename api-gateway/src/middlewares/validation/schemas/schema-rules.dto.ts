import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { EntityStatus } from '@guardian/interfaces';
import { PolicyDTO } from './policies.dto.js';
import { SchemaDTO } from './schemas.dto.js';
import { VcDocumentDTO } from './document.dto.js';

export class SchemaRuleDTO {
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
        nullable: true,
        required: false
    })
    @IsOptional()
    @IsObject()
    config?: any;
}

@ApiExtraModels(PolicyDTO, SchemaDTO)
export class SchemaRuleRelationshipsDTO {
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
    schemas?: SchemaDTO[];
}

@ApiExtraModels(SchemaRuleDTO, VcDocumentDTO)
export class SchemaRuleDataDTO {
    @ApiProperty({
        type: () => SchemaRuleDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    rules?: SchemaRuleDTO;

    @ApiProperty({
        type: () => VcDocumentDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    document?: VcDocumentDTO;

    @ApiProperty({
        type: () => VcDocumentDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsObject()
    relationships?: VcDocumentDTO;
}