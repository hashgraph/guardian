import { DID, DIDAnalytics, DIDDetails, DIDOptions } from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import {
    ApiDetailsHistoryResponseWithDefinition,
    DetailsHistoryDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class DIDOptionsDTO implements DIDOptions {
    @ApiProperty({
        description: 'Relationships',
        example: ['1706823227.586179534'],
    })
    relationships: string[];
    @ApiProperty({
        description: 'DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    did: string;
}

export class DIDAnalyticsDTO implements DIDAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class DIDDTO
    extends MessageDTO<DIDOptionsDTO, DIDAnalyticsDTO>
    implements DID {}

export const DIDDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(DIDDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(DIDOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(DIDAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedDIDResponse = applyDecorators(
    ApiExtraModels(DIDDTO, DIDOptionsDTO, DIDAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('DIDs', DIDDtoDefinition)
);

export class DIDDetailsDTO
    extends DetailsHistoryDTO<DIDDTO>
    implements DIDDetails {}
export const ApiDetailsDIDResponse = applyDecorators(
    ApiExtraModels(DIDDTO, DIDOptionsDTO, DIDAnalyticsDTO),
    ApiDetailsHistoryResponseWithDefinition(DIDDetailsDTO, RawMessageDTO, 'DID details', {
        allOf: [
            { $ref: getSchemaPath(DIDDTO) },
            {
                properties: {
                    options: {
                        $ref: getSchemaPath(DIDOptionsDTO),
                    },
                    analytics: {
                        $ref: getSchemaPath(DIDAnalyticsDTO),
                    },
                },
            },
        ],
    })
);
