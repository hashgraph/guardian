import { MessageAction, MessageType, VC, VCAnalytics, VCDetails, VCOptions } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsHistoryDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

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
    encodedData: boolean;
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
    implements VC
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.VC_DOCUMENT
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateVC
    })
    declare action: MessageAction;
    @ApiProperty({
        type: VCOptionsDTO,
    })
    declare options: VCOptionsDTO;
    @ApiProperty({
        type: VCAnalyticsDTO,
    })
    declare analytics?: VCAnalyticsDTO;
}
export class VCDetailsDTO
    extends DetailsHistoryDTO<VCDTO>
    implements VCDetails
{
    @ApiProperty({
        type: VCDTO,
    })
    declare item?: VCDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: [VCDTO],
    })
    declare history?: VCDTO[];
    @ApiProperty({
        description: 'VC Schema',
        type: 'object',
    })
    schema?: any;
}
