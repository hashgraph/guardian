import {
    ModuleAnalytics,
    ModuleOptions,
    Module,
    ModuleDetails,
} from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import {
    ApiDetailsResponseWithDefinition,
    DetailsDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class ModuleOptionsDTO implements ModuleOptions {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Name',
        example: 'Grid module',
    })
    name: string;
    @ApiProperty({
        description: 'Description',
        example: 'Grid module',
    })
    description: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Module topic identifier',
        example: '0.0.4481265',
    })
    moduleTopicId: string;
}

export class ModuleAnalyticsDTO implements ModuleAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class ModuleDTO
    extends MessageDTO<ModuleOptionsDTO, ModuleAnalyticsDTO>
    implements Module {}

export const ModuleDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(ModuleDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(ModuleOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(ModuleAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedModuleResponse = applyDecorators(
    ApiExtraModels(ModuleDTO, ModuleOptionsDTO, ModuleAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Modules', ModuleDtoDefinition)
);

export class ModuleDetailsDTO
    extends DetailsDTO<ModuleDTO>
    implements ModuleDetails {}
export const ApiDetailsModuleResponse = applyDecorators(
    ApiExtraModels(ModuleDTO, ModuleOptionsDTO, ModuleAnalyticsDTO),
    ApiDetailsResponseWithDefinition(ModuleDetailsDTO, RawMessageDTO, 'Module details', {
        allOf: [
            { $ref: getSchemaPath(ModuleDTO) },
            {
                properties: {
                    options: {
                        $ref: getSchemaPath(ModuleOptionsDTO),
                    },
                    analytics: {
                        $ref: getSchemaPath(ModuleAnalyticsDTO),
                    },
                },
            },
        ],
    })
);
