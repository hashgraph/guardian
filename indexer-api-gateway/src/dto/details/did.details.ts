import { DID, DIDAnalytics, DIDDetails, DIDOptions, MessageAction, MessageType } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsHistoryDTO } from './details.interface.js';
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
    implements DID
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.DID_DOCUMENT
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateDID
    })
    declare action: MessageAction;
    @ApiProperty({
        type: DIDOptionsDTO,
    })
    declare options: DIDOptionsDTO;
    @ApiProperty({
        type: DIDAnalyticsDTO,
    })
    declare analytics?: DIDAnalyticsDTO;
}

export class DIDDetailsDTO
    extends DetailsHistoryDTO<DIDDTO>
    implements DIDDetails
{
    @ApiProperty({
        type: DIDDTO,
    })
    declare item?: DIDDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: [DIDDTO],
    })
    declare history?: DIDDTO[];
}
