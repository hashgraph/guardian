import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { SchemaCategory, SchemaEntity, SchemaStatus, UserRole } from '@guardian/interfaces';
import { Examples } from '../examples.js';

export class SchemaDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: '2026-03-25T12:40:32.586Z'
    })
    createDate?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: '2026-03-25T12:40:59.908Z'
    })
    updateDate?: string;

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
        example: 'Schema name'
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
        enum: SchemaEntity,
        example: SchemaEntity.POLICY
    })
    @IsOptional()
    @IsString()
    entity?: SchemaEntity;

    @ApiProperty({
        type: 'string',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    iri?: string;

    @ApiProperty({
        type: 'string',
        enum: SchemaStatus,
        example: SchemaStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: SchemaStatus;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
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
        required: false,
        nullable: true,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        enum: SchemaCategory,
        example: SchemaCategory.POLICY
    })
    @IsOptional()
    @IsString()
    category?: SchemaCategory;

    @ApiProperty({
        type: 'string',
        example: Examples.IPFS
    })
    @IsOptional()
    @IsString()
    documentURL?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.IPFS
    })
    @IsOptional()
    @IsString()
    contextURL?: string;

    @ApiProperty({
        oneOf: [
            {
                type: 'object',
                additionalProperties: true
            },
            {
                type: 'string',
                example: 'innerSchemaConfigurationInText'
            }
        ]
    })
    @IsOptional()
    @IsObject()
    document?: any;

    @ApiProperty({
        oneOf: [
            {
                type: 'object',
                additionalProperties: true
            },
            {
                type: 'string',
                example: 'jsonLdContextInText'
            }
        ]
    })
    @IsOptional()
    @IsObject()
    context?: any;

    @ApiProperty({
        type: 'boolean',
        required: false,
        nullable: true,
        example: false
    })
    readonly?: boolean;

    @ApiProperty({
        type: 'boolean',
        required: false,
        nullable: true,
        example: false
    })
    system?: boolean;

    @ApiProperty({
        type: 'boolean',
        required: false,
        nullable: true,
        example: false
    })
    active?: boolean;

    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: '1.2.0'
    })
    codeVersion?: string;

    @ApiProperty({
        type: 'number',
        required: false,
        nullable: true,
        example: 1
    })
    topicCount?: number;
}

export class SystemSchemaDTO {
    @ApiProperty({
        type: 'string',
        example: 'Schema name'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        type: 'string',
        enum: [UserRole.STANDARD_REGISTRY, UserRole.USER],
        example: SchemaEntity.STANDARD_REGISTRY
    })
    @IsString()
    @IsNotEmpty()
    @IsIn([UserRole.STANDARD_REGISTRY, UserRole.USER])
    entity: string;

    [key: string]: any;
}

export class ExportSchemaDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Schema name'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: 'string',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;
}

export class VersionSchemaDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: '1.0.0'
    })
    @IsString()
    @IsNotEmpty()
    version: string;
}

export class MessageSchemaDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;
}
