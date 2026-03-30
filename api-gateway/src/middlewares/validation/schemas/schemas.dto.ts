import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { SchemaCategory, SchemaEntity, SchemaStatus, UserRole } from '@guardian/interfaces';
import { Examples } from '../examples.js';

export class SchemaDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Unique universal identifier of the schema',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable schema name',
        example: 'Schema name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'Schema description',
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: String,
        description: 'Schema entity type (e.g. STANDARD_REGISTRY, USER, POLICY, etc.)',
        enum: SchemaEntity,
        example: SchemaEntity.POLICY
    })
    @IsOptional()
    @IsString()
    entity?: SchemaEntity;

    @ApiProperty({
        type: String,
        description: 'Internationalized Resource Identifier for the schema',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    iri?: string;

    @ApiProperty({
        type: String,
        description: 'Schema lifecycle status',
        enum: SchemaStatus,
        example: SchemaStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: SchemaStatus;

    @ApiProperty({
        type: String,
        description: 'Hedera topic ID associated with the schema',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: String,
        description: 'Published version of the schema (semver format)',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the schema owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera message ID for the published schema',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: String,
        description: 'Schema category (POLICY, MODULE, TOOL, TAG, etc.)',
        enum: SchemaCategory,
        example: SchemaCategory.POLICY
    })
    @IsOptional()
    @IsString()
    category?: SchemaCategory;

    @ApiProperty({
        type: String,
        description: 'IPFS URL of the published JSON-LD document',
        example: Examples.IPFS
    })
    @IsOptional()
    @IsString()
    documentURL?: string;

    @ApiProperty({
        type: String,
        description: 'IPFS URL of the published JSON-LD context',
        example: Examples.IPFS
    })
    @IsOptional()
    @IsString()
    contextURL?: string;

    @ApiProperty({
        type: 'object',
        description: 'Raw JSON-LD schema document',
        additionalProperties: true
    })
    @IsOptional()
    @IsObject()
    document?: any;

    @ApiProperty({
        type: 'object',
        description: 'Raw JSON-LD context document',
        additionalProperties: true
    })
    @IsOptional()
    @IsObject()
    context?: any;
}

export class SystemSchemaDTO {
    @ApiProperty({
        type: String,
        description: 'Human-readable schema name',
        example: 'Schema name'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        type: String,
        description: 'Entity type this system schema belongs to',
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
        type: String,
        description: 'Internal database identifier',
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable schema name',
        required: true,
        example: 'Schema name'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        type: String,
        description: 'Schema description',
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: String,
        description: 'Published version of the schema',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the schema owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera message ID for the published schema',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;
}

export class VersionSchemaDTO {
    @ApiProperty({
        type: String,
        description: 'Version string to publish (semver format)',
        required: true,
        example: '1.0.0'
    })
    @IsString()
    @IsNotEmpty()
    version: string;
}

export class MessageSchemaDTO {
    @ApiProperty({
        type: String,
        description: 'Hedera message ID to import schema from',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;
}
