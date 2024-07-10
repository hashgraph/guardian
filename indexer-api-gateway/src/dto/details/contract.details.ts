import {
    ContractAnalytics,
    ContractOptions,
    Contract,
    ContractType,
    ContractDetails,
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

export class ContractOptionsDTO implements ContractOptions {
    @ApiProperty({
        description: 'Contract identifier',
        example: '0.0.4481265',
    })
    contractId: string;
    @ApiProperty({
        description: 'Description',
        example: 'Wipe contract',
    })
    description: string;
    @ApiProperty({
        description: 'Contract type',
        enum: ContractType,
    })
    contractType: ContractType;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
}

export class ContractAnalyticsDTO implements ContractAnalytics {}

export class ContractDTO
    extends MessageDTO<ContractOptionsDTO, ContractAnalyticsDTO>
    implements Contract {}

export const ContractDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(ContractDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(ContractOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(ContractAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedContractResponse = applyDecorators(
    ApiExtraModels(ContractDTO, ContractOptionsDTO, ContractAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('Contracts', ContractDtoDefinition)
);

export class ContractDetailsDTO
    extends DetailsDTO<ContractDTO>
    implements ContractDetails {}
export const ApiDetailsContractResponse = applyDecorators(
    ApiExtraModels(ContractDTO, ContractOptionsDTO, ContractAnalyticsDTO),
    ApiDetailsResponseWithDefinition(ContractDetailsDTO, RawMessageDTO, 'Contract details', {
        allOf: [
            { $ref: getSchemaPath(ContractDTO) },
            {
                properties: {
                    options: {
                        $ref: getSchemaPath(ContractOptionsDTO),
                    },
                    analytics: {
                        $ref: getSchemaPath(ContractAnalyticsDTO),
                    },
                },
            },
        ],
    })
);
