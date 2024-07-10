import {
    Tool,
    ToolActivity,
    ToolAnalytics,
    ToolDetails,
    ToolOptions,
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

export class ToolOptionsDTO implements ToolOptions {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Name',
        example: 'Tool 16',
    })
    name: string;
    @ApiProperty({
        description: 'Description',
        example: 'Tool 16',
    })
    description: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Hash',
        example: '71ZWDSX2cUPsye4AuMUqXUhgk1XBDnpi4Ky1mtjYqYom',
    })
    hash: string;
    @ApiProperty({
        description: 'Tool topic identifier',
        example: '0.0.4481265',
    })
    toolTopicId: string;
    @ApiProperty({
        description: 'Tags topic identifier',
        example: '0.0.4481265',
    })
    tagsTopicId: string;
}

export class ToolAnalyticsDTO implements ToolAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class ToolActivityDTO implements ToolActivity {
    @ApiProperty({
        description: 'Schemas',
        example: 10,
    })
    schemas: number;
    @ApiProperty({
        description: 'Policies',
        example: 10,
    })
    policies: number;
}

export class ToolDTO
    extends MessageDTO<ToolOptionsDTO, ToolAnalyticsDTO>
    implements Tool {}

export const ToolDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(ToolDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(ToolOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(ToolAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedToolResponse = applyDecorators(
    ApiExtraModels(ToolDTO, ToolOptionsDTO, ToolAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Tools', ToolDtoDefinition)
);

export class ToolDetailsDTO
    extends DetailsActivityDTO<ToolDTO, ToolActivityDTO>
    implements ToolDetails {}
export const ApiDetailsToolResponse = applyDecorators(
    ApiExtraModels(ToolDTO, ToolOptionsDTO, ToolAnalyticsDTO),
    ApiDetailsActivityResponseWithDefinition(
        ToolDetailsDTO,
        RawMessageDTO,
        'Tool details',
        ToolActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(ToolDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(ToolOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(ToolAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
