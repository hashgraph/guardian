import {
    Role,
    RoleActivity,
    RoleAnalytics,
    RoleDetails,
    RoleOptions,
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

export class RoleOptionsDTO implements RoleOptions {
    @ApiProperty({
        description: 'Role',
        example: 'Registrant',
    })
    role: string;
    @ApiProperty({
        description: 'Role',
        example: 'Registrants',
    })
    group: string;
    @ApiProperty({
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    issuer: string;
}

export class RoleAnalyticsDTO implements RoleAnalytics {
    @ApiProperty({
        description: 'Policy message identifier',
        example: '1706823227.586179534',
    })
    policyId: string;
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class RoleActivityDTO implements RoleActivity {
    @ApiProperty({
        description: 'VCs',
        example: 10,
    })
    vcs: number;
}

export class RoleDTO
    extends MessageDTO<RoleOptionsDTO, RoleAnalyticsDTO>
    implements Role {}

export const RoleDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(RoleDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(RoleOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(RoleAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedRoleResponse = applyDecorators(
    ApiExtraModels(RoleDTO, RoleOptionsDTO, RoleAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Roles', RoleDtoDefinition)
);

export class RoleDetailsDTO
    extends DetailsActivityDTO<RoleDTO, RoleActivityDTO>
    implements RoleDetails {}
export const ApiDetailsRoleResponse = applyDecorators(
    ApiExtraModels(RoleDTO, RoleOptionsDTO, RoleAnalyticsDTO),
    ApiDetailsActivityResponseWithDefinition(
        RoleDetailsDTO,
        RawMessageDTO,
        'Role details',
        RoleActivityDTO,
        {
            allOf: [
                { $ref: getSchemaPath(RoleDTO) },
                {
                    properties: {
                        options: {
                            $ref: getSchemaPath(RoleOptionsDTO),
                        },
                        analytics: {
                            $ref: getSchemaPath(RoleAnalyticsDTO),
                        },
                    },
                },
            ],
        }
    )
);
