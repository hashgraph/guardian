import {
    ChildSchema,
    ISchema,
    SchemaActivity,
    SchemaAnalytics,
    SchemaDetails,
    SchemaOptions,
} from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import {
    ApiDetailsActivityResponseWithDefinition,
    DetailsActivityDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';
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
        description: 'Child schemas',
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

export class SchemaDTO
    extends MessageDTO<SchemaOptionsDTO, SchemaAnalyticsDTO>
    implements ISchema {}

export const SchemaDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(SchemaDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(SchemaOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(SchemaAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedSchemaResponse = applyDecorators(
    ApiExtraModels(SchemaDTO, SchemaOptionsDTO, SchemaAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Schemas', SchemaDtoDefinition)
);

export class SchemaDetailsDTO
    extends DetailsActivityDTO<SchemaDTO, SchemaActivityDTO>
    implements SchemaDetails {}
export const ApiDetailsSchemaResponse = applyDecorators(
    ApiExtraModels(SchemaDTO, SchemaOptionsDTO, SchemaAnalyticsDTO),
    ApiDetailsActivityResponseWithDefinition(
        SchemaDetailsDTO,
        RawMessageDTO,
        'Schema details',
        SchemaActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(SchemaDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(SchemaOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(SchemaAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
