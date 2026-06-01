import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { ValidationErrorsDTO } from './blocks.js';
import { IsString } from 'class-validator';

/**
 * Minimal tool config for create request. blockType must be "tool".
 */
export class CreateToolConfigDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: '47c1f826-88ef-46a0-b3b7-e9038108f97c',
        description: 'Config block ID (UUID)'
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        enum: ['tool'],
        example: 'tool',
        description: 'Must be "tool"'
    })
    blockType: 'tool';
}

/**
 * Request body for creating a tool (POST /tools, POST /tools/push).
 * Only `config` with `blockType: "tool"` is required. Other fields are optional.
 * Fields like id, uuid, creator, owner, topicId are set by the server.
 */
@ApiExtraModels(CreateToolConfigDTO)
export class CreateToolDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Tool name',
        description: 'Tool display name'
    })
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Description',
        description: 'Tool description'
    })
    description?: string;

    @ApiProperty({
        type: () => CreateToolConfigDTO,
        required: true,
        description: 'Tool config. Must have blockType: "tool". May include id (UUID).'
    })
    config: CreateToolConfigDTO;
}

/**
 * Tool config in API response (structure differs from BlockDTO).
 */
export class ToolConfigResponseDTO {
    @ApiProperty({ type: 'string' })
    id: string;

    @ApiProperty({ type: 'string', enum: ['tool'] })
    blockType: string;

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    permissions?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    children?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    events?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    artifacts?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    variables?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    inputEvents?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    outputEvents?: any[];

    @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
    innerEvents?: any[];

    @ApiProperty({ type: 'string', required: false })
    tag?: string;
}

@ApiExtraModels(ToolConfigResponseDTO)
export class ToolDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Tool name'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    description?: string;

    @ApiProperty({
        type: 'string',
        enum: [
            'DRAFT',
            'PUBLISHED',
            'PUBLISH_ERROR'
        ],
        example: 'DRAFT'
    })
    status?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    creator?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    topicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: Examples.MESSAGE_ID,
        description: 'Message ID (for PUBLISHED tools only; omitted or null for DRAFT)'
    })
    messageId?: string | null;

    @ApiProperty({
        type: 'string',
        example: '1.0.0'
    })
    codeVersion?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE,
        description: 'Last update date'
    })
    updateDate?: string;

    @ApiProperty({
        type: 'string',
        description: 'Config file ID (internal)'
    })
    configFileId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        description: 'Tags topic ID (for PUBLISHED tools only)'
    })
    tagsTopicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        description: 'File id of the original tool zip (imported from IPFS or publish flow). Present for PUBLISHED tools.'
    })
    contentFileId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        description: 'Hash (for PUBLISHED tools only)'
    })
    hash?: string;

    @ApiProperty({
        type: 'array',
        items: { type: 'object' },
        description: 'Referenced sub-tools: { name, version?, topicId, messageId }'
    })
    tools?: any[];

    @ApiProperty({
        type: () => ToolConfigResponseDTO,
        required: true,
    })
    config: ToolConfigResponseDTO;

    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: '1.0.0',
        description: 'Published tool version (e.g. 1.0.0); null or omitted when not published'
    })
    version?: string | null;
}

@ApiExtraModels(ToolDTO)
export class ToolPreviewDTO {
    @ApiProperty({
        type: () => ToolDTO,
        description:
            'Main tool object from `tool.json` in the IPFS archive. Shape is close to ToolDTO but may omit DB-only fields (id, uuid, status, topicId, messageId, etc.).'
    })
    tool: ToolDTO;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        description: 'Schema entities parsed from `schemas/*` in the archive (full Schema objects with document, context, …)'
    })
    schemas?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        description: 'Tag entities parsed from `tags/*` in the archive'
    })
    tags?: any[];

    @ApiProperty({
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Additional tool JSON files from `tools/*` in the archive (not the same as top-level `tool`)'
    })
    tools: any[];

    @ApiPropertyOptional({
        type: 'string',
        description:
            'Present only for `POST /tools/import/message/preview` — same as request `messageId`. Omitted for file-based preview.'
    })
    messageId?: string;

    @ApiPropertyOptional({
        type: 'string',
        description:
            'Present only for message-based preview — topic id from the Hedera tool message. Omitted for file-based preview.'
    })
    toolTopicId?: string;
}

@ApiExtraModels(ToolDTO)
export class ToolImportResponseDTO {
    @ApiProperty({
        type: () => ToolDTO,
        description: 'Imported tool entity.'
    })
    tool: ToolDTO;

    @ApiProperty({
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: true
        },
        description: 'Import errors. Empty array means the import completed without reported errors.'
    })
    errors: any[];
}

export class ToolMenuConfigItemDTO {
    @ApiProperty({
        type: 'string',
        example: 'input_tool_03'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: ''
    })
    description: string;
}

export class ToolMenuVariableDTO {
    @ApiProperty({
        type: 'string',
        example: 'Role'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: ''
    })
    description: string;

    @ApiProperty({
        type: 'string',
        example: 'Role'
    })
    type: string;
}

@ApiExtraModels(ToolMenuConfigItemDTO, ToolMenuVariableDTO)
export class ToolMenuConfigDTO {
    @ApiPropertyOptional({
        type: () => ToolMenuConfigItemDTO,
        isArray: true,
        description: 'Tool input events exposed in the menu.'
    })
    inputEvents?: ToolMenuConfigItemDTO[];

    @ApiPropertyOptional({
        type: () => ToolMenuConfigItemDTO,
        isArray: true,
        description: 'Tool output events exposed in the menu.'
    })
    outputEvents?: ToolMenuConfigItemDTO[];

    @ApiPropertyOptional({
        type: () => ToolMenuVariableDTO,
        isArray: true,
        description: 'Tool variables exposed in the menu.'
    })
    variables?: ToolMenuVariableDTO[];
}

export class ToolMenuSchemaDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id: string;

    @ApiProperty({
        type: 'string',
        example: 'Tool 03'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: ''
    })
    description: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    topicId: string;

    @ApiProperty({
        type: 'string',
        example: '#a9fe3be9-38d5-452e-9948-5c319d5c14e1&1.0.0'
    })
    iri: string;

    @ApiPropertyOptional({
        type: 'string',
        example: 'POLICY',
        description: 'Schema category when present in the source response.'
    })
    category?: string;
}

export class ToolMenuSubToolDTO {
    @ApiPropertyOptional({
        type: 'string',
        example: 'Tool 03',
        description: 'Referenced sub-tool name.'
    })
    name?: string;

    @ApiPropertyOptional({
        type: 'string',
        nullable: true,
        example: '1.0.0',
        description: 'Referenced sub-tool version when available.'
    })
    version?: string | null;

    @ApiPropertyOptional({
        type: 'string',
        example: Examples.ACCOUNT_ID,
        description: 'Referenced sub-tool topic id.'
    })
    topicId?: string;

    @ApiPropertyOptional({
        type: 'string',
        example: Examples.MESSAGE_ID,
        description: 'Referenced sub-tool message id.'
    })
    messageId?: string;
}

@ApiExtraModels(ToolMenuConfigDTO, ToolMenuSchemaDTO, ToolMenuSubToolDTO)
export class ToolMenuItemDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id: string;

    @ApiProperty({
        type: 'string',
        example: Examples.HASH
    })
    hash: string;

    @ApiProperty({
        type: 'string',
        example: 'Tool 03'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: ''
    })
    description: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    owner: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    topicId: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    messageId: string;

    @ApiProperty({
        type: () => ToolMenuSubToolDTO,
        isArray: true,
        description: 'Referenced sub-tools from the tool config.'
    })
    tools: ToolMenuSubToolDTO[];

    @ApiProperty({
        type: () => ToolMenuConfigDTO,
        description: 'Reduced tool config returned by the menu endpoint.'
    })
    config: ToolMenuConfigDTO;

    @ApiProperty({
        type: () => ToolMenuSchemaDTO,
        isArray: true,
        description: 'Schemas linked to the tool topic.'
    })
    schemas: ToolMenuSchemaDTO[];
}

@ApiExtraModels(ToolDTO, ValidationErrorsDTO)
export class ToolValidationDTO {
    @ApiProperty({
        type: () => ToolDTO
    })
    tool: ToolDTO;

    @ApiProperty({
        type: () => ValidationErrorsDTO
    })
    results: ValidationErrorsDTO;
}

/**
 * Response for PUT /tools/:id/publish (sync publish).
 * Differs from ToolValidationDTO: has isValid and errors instead of results.
 */
@ApiExtraModels(ToolDTO, ValidationErrorsDTO)
export class ToolPublishResponseDTO {
    @ApiProperty({
        type: () => ToolDTO
    })
    tool: ToolDTO;

    @ApiProperty({
        type: 'boolean',
        description: 'Whether validation passed (true = tool published successfully)'
    })
    isValid: boolean;

    @ApiProperty({
        type: () => ValidationErrorsDTO,
        description: 'Validation errors and block-level results'
    })
    errors: ValidationErrorsDTO;
}

/**
 * Response for PUT /tools/:id/dry-run.
 * Validation outcome only (no tool entity in body). When isValid is true, dry run started server-side.
 */
@ApiExtraModels(ValidationErrorsDTO)
export class ToolDryRunResponseDTO {
    @ApiProperty({
        type: 'boolean',
        description: 'Whether the tool config passed validation (true = dry run started; false = dry run not started)'
    })
    isValid: boolean;

    @ApiProperty({
        type: () => ValidationErrorsDTO,
        description: 'Validation details (blocks, tools, common errors)'
    })
    errors: ValidationErrorsDTO;
}

export class ToolVersionDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: '1.0.0'
    })
    @IsString()
    toolVersion: string;
}

/**
 * GET /tools/:id/export/message — guardian `TOOL_EXPORT_MESSAGE` body (includes internal `id`).
 */
export class ToolExportMessageDTO {
    @ApiProperty({ type: 'string', description: 'Tool ID (internal)' })
    id: string;

    @ApiProperty({ type: 'string' })
    uuid: string;

    @ApiProperty({ type: 'string' })
    name: string;

    @ApiProperty({ type: 'string' })
    description: string;

    @ApiProperty({
        type: 'string',
        nullable: true,
        description: 'Hedera topic message id when published; null for DRAFT / not yet published'
    })
    messageId: string | null;

    @ApiProperty({ type: 'string' })
    owner: string;
}

/**
 * Tool list item for GET /tools v1 (includes uuid, hash)
 */
export class ToolListV1ItemDTO {
    @ApiProperty({
        type: 'string'
    })
    id: string;

    @ApiProperty({
        type: 'string'
    })
    uuid: string;

    @ApiProperty({
        type: 'string',
        nullable: true,
        description: 'Hash (for PUBLISHED tools only)'
    })
    hash?: string;

    @ApiProperty({
        type: 'string'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        nullable: true
    })
    description?: string;

    @ApiProperty({
        type: 'string',
        enum: ['DRAFT', 'PUBLISHED', 'PUBLISH_ERROR']
    })
    status: string;

    @ApiProperty({
        type: 'string'
    })
    creator: string;

    @ApiProperty({
        type: 'string'
    })
    owner: string;

    @ApiProperty({
        type: 'string'
    })
    topicId: string;

    @ApiProperty({
        type: 'string',
        nullable: true,
        description: 'Message ID (for PUBLISHED tools only)'
    })
    messageId?: string;
}

/**
 * Tool list item for GET /tools v2 (no uuid, no hash)
 */
export class ToolListV2ItemDTO {
    @ApiProperty({
        type: 'string'
    })
    id: string;

    @ApiProperty({
        type: 'string'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        nullable: true
    })
    description?: string;

    @ApiProperty({
        type: 'string',
        enum: ['DRAFT', 'PUBLISHED', 'PUBLISH_ERROR']
    })
    status: string;

    @ApiProperty({
        type: 'string'
    })
    creator: string;

    @ApiProperty({
        type: 'string'
    })
    owner: string;

    @ApiProperty({
        type: 'string'
    })
    topicId: string;

    @ApiProperty({
        type: 'string',
        nullable: true,
        description: 'Message ID (for PUBLISHED tools only)'
    })
    messageId?: string;
}