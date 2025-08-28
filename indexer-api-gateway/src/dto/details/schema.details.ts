import {
    ChildSchema,
    ISchema,
    MessageAction,
    MessageType,
    SchemaActivity,
    SchemaAnalytics,
    SchemaDetails,
    SchemaOptions,
    SchemasPackageActivity,
    SchemasPackageDetails,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class SchemaOptionsDTO implements SchemaOptions {
    @ApiProperty({
        description: 'Name',
        example: 'Monitoring report',
    })
    name: string;
    @ApiProperty({
        description: 'Description',
        example: 'Monitoring report schema',
    })
    description: string;
    @ApiProperty({
        description: 'Entity',
        example: 'VC',
    })
    entity: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Version',
        example: '1.0.0',
    })
    version: string;
    @ApiProperty({
        description: 'Code version',
        example: '1.0.0',
    })
    codeVersion: string;
    @ApiProperty({
        description: 'Relationships',
        example: ['1706823227.586179534'],
    })
    relationships: string[];
}

export class ChildSchemaDTO implements ChildSchema {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        description: 'Name',
        example: 'Project Details',
    })
    name: string;
}

export class SchemaAnalyticsDTO implements SchemaAnalytics {
    @ApiProperty({
        description: 'Policy message identifiers',
        example: ['1706823227.586179534'],
    })
    policyIds: string[];
    @ApiProperty({
        type: ChildSchemaDTO,
    })
    childSchemas: ChildSchema[];
    @ApiProperty({
        description: 'Schema properties',
        example: ['ActivityImpactModule.projectScope'],
    })
    properties: string[];
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class SchemaActivityDTO implements SchemaActivity {
    @ApiProperty({
        description: 'VCs',
        example: 10,
    })
    vcs: number;
    @ApiProperty({
        description: 'VPs',
        example: 10,
    })
    vps: number;
}

export class SchemaGridDTO
    extends MessageDTO<SchemaOptionsDTO, SchemaAnalyticsDTO>
    implements ISchema
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.SCHEMA
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.PublishSchema
    })
    declare action: MessageAction;
    @ApiProperty({
        type: SchemaOptionsDTO,
    })
    declare options: SchemaOptionsDTO;
}

export class SchemaDetailsItemDTO
    extends MessageDTO<SchemaOptionsDTO, SchemaAnalyticsDTO>
    implements ISchema
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.SCHEMA
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.PublishSchema
    })
    declare action: MessageAction;
    @ApiProperty({
        type: SchemaOptionsDTO,
    })
    declare options: SchemaOptionsDTO;
    @ApiProperty({
        type: SchemaAnalyticsDTO,
    })
    declare analytics?: SchemaAnalyticsDTO;
    @ApiProperty({
        description: 'Documents',
        type: 'array',
        items: {
            type: 'string',
        },
        example: [
            `{\"$id\":\"#d0e99e70-3511-486668e-bf6f-10041e9a0cb7669080&1.0.0\",\"$comment\":\"{ \\\"@id\\\": \\\"#d0e99e70-3511-486668e-bf6f-10041e9a0cb7669080&1.0.0\\\", \\\"term\\\": \\\"d0e99e70-3511-486668e-bf6f-10041e9a0cb7669080&1.0.0\\\" }\",\"title\":\"tagSchemaAPI339404\",\"description\":\"tagSchemaAPI339404\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false,\"$defs\":{}}`,
            `{\"@context\":{\"@version\":1.1,\"@vocab\":\"https://w3id.org/traceability/#undefinedTerm\",\"id\":\"@id\",\"type\":\"@type\",\"d0e99e70-3511-486668e-bf6f-10041e9a0cb7669080&1.0.0\":{\"@id\":\"#d0e99e70-3511-486668e-bf6f-10041e9a0cb7669080&1.0.0\",\"@context\":{}}}}`
          ]
    })
    declare documents: any[];
}

export class SchemaDetailsDTO
    extends DetailsActivityDTO<SchemaDetailsItemDTO, SchemaActivityDTO>
    implements SchemaDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: SchemaDetailsItemDTO,
    })
    declare item?: SchemaDetailsItemDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: SchemaActivityDTO,
    })
    declare activity?: SchemaActivityDTO;
}

export class SchemasPackageActivityDTO implements SchemasPackageActivity {
    @ApiProperty({
        description: 'Schemas',
        example: 10,
    })
    schemas: number;
}

export class SchemasPackageDetailsDTO
    extends DetailsActivityDTO<SchemaDetailsItemDTO, SchemasPackageActivity>
    implements SchemasPackageDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: SchemaDetailsItemDTO,
    })
    declare item?: SchemaDetailsItemDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: SchemasPackageActivityDTO,
    })
    declare activity?: SchemasPackageActivityDTO;
}
