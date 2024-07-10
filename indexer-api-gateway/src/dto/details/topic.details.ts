import {
    Topic,
    TopicActivity,
    TopicAnalytics,
    TopicOptions,
    TopicType,
} from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from './message.details.js';
import {
    ApiDetailsActivityResponseWithDefinition,
    DetailsActivityDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';

export class TopicOptionsDTO implements TopicOptions {
    @ApiProperty({
        description: 'Name',
        example: 'Policy topic',
    })
    name: string;
    @ApiProperty({
        description: 'Name',
        example: 'Verra REDD Policy topic',
    })
    description: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Message type',
        enum: TopicType,
    })
    messageType: TopicType;
    @ApiProperty({
        description: 'Child topic identifier',
        example: '0.0.4481265',
    })
    childId: string;
    @ApiProperty({
        description: 'Parent topic identifier',
        example: '0.0.4481265',
    })
    parentId: string;
    @ApiProperty({
        description: 'Rationale',
        example: '1706895596.736882433',
    })
    rationale: string;
}

export class TopicAnalyticsDTO implements TopicAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class TopicActivityDTO implements TopicActivity {
    @ApiProperty({
        description: 'Registries',
        example: 10,
    })
    registries: number;
    @ApiProperty({
        description: 'Topics',
        example: 10,
    })
    topics: number;
    @ApiProperty({
        description: 'Policies',
        example: 10,
    })
    policies: number;
    @ApiProperty({
        description: 'Tools',
        example: 10,
    })
    tools: number;
    @ApiProperty({
        description: 'Modules',
        example: 10,
    })
    modules: number;
    @ApiProperty({
        description: 'Tokens',
        example: 10,
    })
    tokens: number;
    @ApiProperty({
        description: 'DIDs',
        example: 10,
    })
    dids: number;
    @ApiProperty({
        description: 'Contracts',
        example: 10,
    })
    contracts: number;
    @ApiProperty({
        description: 'Schemas',
        example: 10,
    })
    schemas: number;
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
    @ApiProperty({
        description: 'Roles',
        example: 10,
    })
    roles: number;
}

export class TopicDTO
    extends MessageDTO<TopicOptionsDTO, TopicAnalyticsDTO>
    implements Topic {}

export const TopicDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(TopicDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(TopicOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(TopicAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedTopicResponse = applyDecorators(
    ApiExtraModels(TopicDTO, TopicOptionsDTO, TopicAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Topics', TopicDtoDefinition)
);

export class TopicDetailsDTO extends DetailsActivityDTO<
    TopicDTO,
    TopicActivityDTO
> {}
export const ApiDetailsTopicResponse = applyDecorators(
    ApiExtraModels(TopicDTO, TopicOptionsDTO, TopicAnalyticsDTO),
    ApiDetailsActivityResponseWithDefinition(
        'Topic details',
        TopicActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(TopicDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(TopicOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(TopicAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
