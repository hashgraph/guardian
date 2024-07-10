import {
    RegistryUser,
    RegistryUserActivity,
    RegistryUserAnalytics,
    RegistryUserDetails,
    RegistryUserOptions,
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

export class RegistryUserOptionsDTO implements RegistryUserOptions {
    @ApiProperty({
        description: 'DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    did: string;
}

export class RegistryUserAnalyticsDTO implements RegistryUserAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class RegistryUserActivityDTO implements RegistryUserActivity {
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

export class RegistryUserDTO
    extends MessageDTO<RegistryUserOptionsDTO, RegistryUserAnalyticsDTO>
    implements RegistryUser {}

export const RegistryUserDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(RegistryUserDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(RegistryUserOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(RegistryUserAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedRegistryUserResponse = applyDecorators(
    ApiExtraModels(
        RegistryUserDTO,
        RegistryUserOptionsDTO,
        RegistryUserAnalyticsDTO
    ),
    ApiPaginatedResponseWithDefinition(
        'Registry users',
        RegistryUserDtoDefinition
    )
);

export class RegistryUserDetailsDTO
    extends DetailsActivityDTO<RegistryUserDTO, RegistryUserActivityDTO>
    implements RegistryUserDetails {}
export const ApiDetailsRegistryUserResponse = applyDecorators(
    ApiExtraModels(
        RegistryUserDTO,
        RegistryUserOptionsDTO,
        RegistryUserAnalyticsDTO
    ),
    ApiDetailsActivityResponseWithDefinition(
        RegistryUserDetailsDTO,
        RawMessageDTO,
        'Registry user details',
        RegistryUserActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(RegistryUserDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(RegistryUserOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(RegistryUserAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
