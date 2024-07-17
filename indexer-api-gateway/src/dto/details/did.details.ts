import {
    DID,
    DIDAnalytics,
    DIDDetails,
    DIDOptions,
    MessageAction,
    MessageType,
} from '@indexer/interfaces';
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

export class DIDGridDTO
    extends MessageDTO<DIDOptionsDTO, DIDAnalyticsDTO>
    implements DID
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.DID_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateDID,
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

export class DIDDetailsItemDTO
    extends MessageDTO<DIDOptionsDTO, DIDAnalyticsDTO>
    implements DID
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.DID_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateDID,
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
    @ApiProperty({
        description: 'Documents',
        type: 'array',
        items: {
            type: 'string',
        },
        example: [
            `"{\"@context\":\"https://www.w3.org/ns/did/v1\",\"id\":\"did:hedera:testnet:C37cfiAMHeToXMiy1V5rAVJdhd182QJRGxwsWQpu2dN2_0.0.1533438\",\"verificationMethod\":[{\"id\":\"did:hedera:testnet:C37cfiAMHeToXMiy1V5rAVJdhd182QJRGxwsWQpu2dN2_0.0.1533438#did-root-key\",\"type\":\"Ed25519VerificationKey2018\",\"controller\":\"did:hedera:testnet:C37cfiAMHeToXMiy1V5rAVJdhd182QJRGxwsWQpu2dN2_0.0.1533438\",\"publicKeyBase58\":\"8WkE4uKLN7i9RnzeoUJfxSH9Jw8M1yTzKk6rtwVa6uGP\"},{\"id\":\"did:hedera:testnet:C37cfiAMHeToXMiy1V5rAVJdhd182QJRGxwsWQpu2dN2_0.0.1533438#did-root-key-bbs\",\"type\":\"Bls12381G2Key2020\",\"controller\":\"did:hedera:testnet:C37cfiAMHeToXMiy1V5rAVJdhd182QJRGxwsWQpu2dN2_0.0.1533438\",\"publicKeyBase58\":\"237NDsUq7LAmSMzE6CEBFyuz9s2sscSz2M6cn4zUKPmJ5Q6rMh6SLRGC3EDdna7vSKwHMCGjhCiLKM6qYU7ZeYKRPNnRMcadoJbSQ44SGAAiyrpmhX8aaoTZpMdHmGFVXdqC\"}],\"authentication\":[\"did:hedera:testnet:C37cfiAMHeToXMiy1V5rAVJdhd182QJRGxwsWQpu2dN2_0.0.1533438#did-root-key\"],\"assertionMethod\":[\"#did-root-key\",\"#did-root-key-bbs\"]}"`,
        ],
    })
    declare documents: any[];
}

export class DIDDetailsDTO
    extends DetailsHistoryDTO<DIDDetailsItemDTO>
    implements DIDDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: DIDDetailsItemDTO,
    })
    declare item?: DIDDetailsItemDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: [DIDDetailsItemDTO],
    })
    declare history?: DIDDetailsItemDTO[];
}
