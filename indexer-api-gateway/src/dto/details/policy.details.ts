import {
    Policy,
    PolicyActivity,
    PolicyAnalytics,
    PolicyOptions,
} from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from './message.details.js';
import {
    ApiDetailsActivityResponseWithDefinition,
    DetailsActivityDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';

export class PolicyOptionsDTO implements PolicyOptions {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Name',
        example: 'Verra REDD',
    })
    name: string;
    @ApiProperty({
        description: 'Description',
        example: 'Verra REDD Policy',
    })
    description: string;
    @ApiProperty({
        description: 'Topic description',
        example: 'Verra REDD Policy Topic',
    })
    topicDescription: string;
    @ApiProperty({
        description: 'Version',
        example: '1.0.0',
    })
    version: string;
    @ApiProperty({
        description: 'Policy tag',
        example: 'Verra_REDD',
    })
    policyTag: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Policy topic identifier',
        example: '0.0.4481265',
    })
    policyTopicId: string;
    @ApiProperty({
        description: 'Policy instance topic identifier',
        example: '0.0.4481265',
    })
    instanceTopicId: string;
    @ApiProperty({
        description: 'Synchronization topic identifier',
        example: '0.0.4481265',
    })
    synchronizationTopicId: string;
    @ApiProperty({
        description: 'Discontinued date',
        example: '2024-02-27T16:32:08.513Z',
    })
    discontinuedDate?: string;
}

export class PolicyAnalyticsDTO implements PolicyAnalytics {
    @ApiProperty({
        description: 'Tools',
        example: ['1706823227.586179534'],
    })
    tools: string[];
    @ApiProperty({
        description: 'Registry identifier',
        example: ['1706823227.586179534'],
    })
    registryId: string;
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class PolicyActivityDTO implements PolicyActivity {
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

export class PolicyDTO extends MessageDTO<
    PolicyOptionsDTO,
    PolicyAnalyticsDTO
> implements Policy {}

export const PolicyDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(PolicyDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(PolicyOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(PolicyAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedPolicyResponse = applyDecorators(
    ApiExtraModels(PolicyDTO, PolicyOptionsDTO, PolicyAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Policies', PolicyDtoDefinition)
);

export class PolicyDetailsDTO extends DetailsActivityDTO<
    PolicyDTO,
    PolicyActivityDTO
> {}
export const ApiDetailsPolicyResponse = applyDecorators(
    ApiExtraModels(PolicyDTO, PolicyOptionsDTO, PolicyAnalyticsDTO),
    ApiDetailsActivityResponseWithDefinition(
        'Policy details',
        PolicyActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(PolicyDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(PolicyOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(PolicyAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
