import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { EntityStatus } from '@guardian/interfaces';
import { VcDocumentDTO } from './document.dto.js';
import { SchemaDTO } from './schemas.dto.js';
import { PolicyDTO } from './policies.dto.js';

export class FormulaDTO {
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
        nullable: true,
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    config?: any;
}

@ApiExtraModels(PolicyDTO, SchemaDTO, FormulaDTO)
export class FormulaRelationshipsDTO {
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

    @ApiProperty({
        type: () => FormulaDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsObject()
    formulas?: FormulaDTO[];
}

export class FormulasOptionsDTO {
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
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    schemaId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    documentId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    parentId?: string;
}

@ApiExtraModels(FormulaDTO, SchemaDTO, VcDocumentDTO)
export class FormulasDataDTO {
    @ApiProperty({
        type: () => FormulaDTO,
        required: false,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    formulas?: FormulaDTO[];

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
    @IsArray()
    relationships?: VcDocumentDTO[];

    @ApiProperty({
        type: () => SchemaDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    schemas?: SchemaDTO[];
}
