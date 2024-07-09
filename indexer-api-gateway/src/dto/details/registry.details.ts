import {
    Registry,
    RegistryActivity,
    RegistryAnalytics,
    RegistryOptions,
} from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from './message.details.js';
import {
    ApiDetailsActivityResponseWithDefinition,
    DetailsActivityDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';

export class RegistryOptionsDTO implements RegistryOptions {
    @ApiProperty({
        description: 'DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    did: string;
    @ApiProperty({
        description: 'Registrant topic id',
    })
    registrantTopicId: string;
    @ApiProperty({
        description: 'Lang',
    })
    lang: string;
    @ApiProperty({
        description: 'Attributes',
    })
    attributes: any;
}

export class RegistryAnalyticsDTO implements RegistryAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class RegistryActivityDTO implements RegistryActivity {
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
        description: 'Policies',
        example: 10,
    })
    policies: number;
    @ApiProperty({
        description: 'Roles',
        example: 10,
    })
    roles: number;
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
        description: 'Registry users',
        example: 10,
    })
    users: number;
}

export class RegistryDTO extends MessageDTO<
    RegistryOptionsDTO,
    RegistryAnalyticsDTO
> implements Registry {}

export const RegistryDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(RegistryDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(RegistryOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(RegistryAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedRegistryResponse = applyDecorators(
    ApiExtraModels(RegistryDTO, RegistryOptionsDTO, RegistryAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Registries', RegistryDtoDefinition)
);

export class RegistryDetailsDTO extends DetailsActivityDTO<
    RegistryDTO,
    RegistryActivityDTO
> {}
export const ApiDetailsRegistryResponse = applyDecorators(
    ApiExtraModels(RegistryDTO, RegistryOptionsDTO, RegistryAnalyticsDTO),
    ApiDetailsActivityResponseWithDefinition(
        'Registry details',
        RegistryActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(RegistryDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(RegistryOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(RegistryAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
