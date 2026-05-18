import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
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

export class SchemaParentDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        example: 'Schema name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        enum: SchemaStatus,
        example: SchemaStatus.PUBLISHED
    })
    @IsOptional()
    @IsString()
    status?: SchemaStatus;

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
        example: ''
    })
    @IsOptional()
    @IsString()
    sourceVersion?: string;

    @ApiProperty({
        type: 'string',
        enum: SchemaCategory,
        example: SchemaCategory.POLICY
    })
    @IsOptional()
    @IsString()
    category?: SchemaCategory;
}

/** Item shape for `GET /schemas/list/all` (short schema list). */
export class SchemaListAllItemDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        example: 'Project Description'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        example: 'Project Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: 'string',
        enum: SchemaStatus,
        example: SchemaStatus.PUBLISHED
    })
    @IsOptional()
    @IsString()
    status?: SchemaStatus;

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
        example: ''
    })
    @IsOptional()
    @IsString()
    sourceVersion?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        enum: SchemaCategory,
        example: SchemaCategory.POLICY
    })
    @IsOptional()
    @IsString()
    category?: SchemaCategory;
}

export class SchemaWithSubSchemasDTO {
    @ApiProperty({
        type: () => SchemaDTO,
        required: false,
        nullable: true
    })
    @IsOptional()
    schema?: SchemaDTO;

    @ApiProperty({
        type: () => SchemaDTO,
        isArray: true,
        required: false
    })
    @IsOptional()
    subSchemas?: SchemaDTO[];
}

/** Body for `POST /schemas/push/copy` (async schema copy). */
export class SchemaPushCopyRequestDTO {
    @ApiProperty({
        type: 'string',
        description: 'Target Hedera topic id for the copied schema.',
        example: Examples.ACCOUNT_ID
    })
    @IsString()
    @IsNotEmpty()
    topicId: string;

    @ApiProperty({
        type: 'string',
        description: 'Display name for the copied schema.',
        example: 'Project lamp type and charging method copy'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        type: 'string',
        description: 'Source schema IRI (with `#` prefix, typically `uuid&version`).',
        example: '#b242b108-c226-46ab-b527-7c2bbf1275ea&1.0.0'
    })
    @IsString()
    @IsNotEmpty()
    iri: string;

    @ApiProperty({
        type: 'boolean',
        description: 'When true, nested schemas are copied together with the source.',
        example: true
    })
    @IsBoolean()
    copyNested: boolean;
}

/** Body for `POST /schemas/import/schemas/duplicates` (duplicate check before import). */
export class SchemaImportDuplicatesRequestDTO {
    @ApiProperty({
        type: 'string',
        description: 'Target policy topic id used to search for existing draft schemas that can be replaced.',
        example: Examples.ACCOUNT_ID
    })
    @IsString()
    @IsNotEmpty()
    policyId: string;

    @ApiProperty({
        type: 'array',
        items: {
            type: 'string'
        },
        description: 'Schema names from the imported package to check for duplicates in the target policy topic.',
        example: ['Project Details', 'Date Range']
    })
    @IsArray()
    schemaNames: string[];
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
