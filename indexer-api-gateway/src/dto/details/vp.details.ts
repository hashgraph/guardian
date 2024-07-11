import { VP, VPAnalytics, VPDetails, VPOptions } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsHistoryDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class VPOptionsDTO implements VPOptions {
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
}

export class VPAnalyticsDTO implements VPAnalytics {
    @ApiProperty({
        description: 'Schema message identifiers',
        example: ['1706823227.586179534'],
    })
    schemaIds: string[];
    @ApiProperty({
        description: 'Schema names',
        example: ['Monitoring Report'],
    })
    schemaNames: string[];
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

export class VPDTO
    extends MessageDTO<VPOptionsDTO, VPAnalyticsDTO>
    implements VP
{
    @ApiProperty({
        type: VPOptionsDTO,
    })
    declare options: VPOptionsDTO;
    @ApiProperty({
        type: VPAnalyticsDTO,
    })
    declare analytics: VPAnalyticsDTO;
}

export class VPDetailsDTO
    extends DetailsHistoryDTO<VPDTO>
    implements VPDetails
{
    @ApiProperty({
        type: VPDTO,
    })
    declare item?: VPDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: [VPDTO],
    })
    declare history?: VPDTO[];
}
