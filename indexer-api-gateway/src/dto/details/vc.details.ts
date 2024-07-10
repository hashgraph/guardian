import { VC, VCAnalytics, VCOptions } from '@indexer/interfaces';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { MessageDTO } from './message.details.js';
import {
    ApiDetailsHistoryResponseWithDefinition,
    DetailsHistoryDTO,
} from './details.interface.js';
import { applyDecorators } from '@nestjs/common';
import { ApiPaginatedResponseWithDefinition } from '../decorators/api-paginated-response.js';

export class VCOptionsDTO implements VCOptions {
    @ApiProperty({
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    issuer: string;
    @ApiProperty({
        description: 'Relationships',
        example: ['1706823227.586179534'],
    })
    relationships: string[];
    @ApiProperty({
        description: 'Document status',
        example: 'Approved',
    })
    documentStatus: string;
    @ApiProperty({
        description: 'Encoded EVC data',
    })
    encodedData?: string;
}

export class VCAnalyticsDTO implements VCAnalytics {
    @ApiProperty({
        description: 'Policy message identifier',
        example: '1706823227.586179534',
    })
    policyId?: string;
    @ApiProperty({
        description: 'Schema message identifier',
        example: '1706823227.586179534',
    })
    schemaId?: string;
    @ApiProperty({
        description: 'Schema name',
        example: 'Monitoring Report',
    })
    schemaName: string;
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class VCDTO
    extends MessageDTO<VCOptionsDTO, VCAnalyticsDTO>
    implements VC {}

export const VCDtoDefinition = {
    allOf: [
        { $ref: getSchemaPath(VCDTO) },
        {
            properties: {
                options: {
                    $ref: getSchemaPath(VCOptionsDTO),
                },
                analytics: {
                    $ref: getSchemaPath(VCAnalyticsDTO),
                },
            },
        },
    ],
};

export const ApiPaginatedVCResponse = applyDecorators(
    ApiExtraModels(VCDTO, VCOptionsDTO, VCAnalyticsDTO),
    ApiPaginatedResponseWithDefinition('VCs', VCDtoDefinition)
);

export class VCDetailsDTO extends DetailsHistoryDTO<VCDTO> {}
export const ApiDetailsVCResponse = applyDecorators(
    ApiExtraModels(VCDTO, VCOptionsDTO, VCAnalyticsDTO),
    ApiDetailsHistoryResponseWithDefinition('VC details', {
        allOf: [
            { $ref: getSchemaPath(VCDTO) },
            {
                properties: {
                    options: {
                        $ref: getSchemaPath(VCOptionsDTO),
                    },
                    analytics: {
                        $ref: getSchemaPath(VCAnalyticsDTO),
                    },
                },
            },
        ],
    })
);
