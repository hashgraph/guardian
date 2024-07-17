import {
    MessageAction,
    MessageType,
    RegistryUser,
    RegistryUserActivity,
    RegistryUserAnalytics,
    RegistryUserDetails,
    RegistryUserOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
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

export class RegistryUserGridDTO
    extends MessageDTO<RegistryUserOptionsDTO, RegistryUserAnalyticsDTO>
    implements RegistryUser
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
        type: RegistryUserOptionsDTO,
    })
    declare options: RegistryUserOptionsDTO;
    @ApiProperty({
        type: RegistryUserAnalyticsDTO,
    })
    declare analytics?: RegistryUserAnalyticsDTO;
}

export class RegistryUserDetailsItemDTO
    extends MessageDTO<RegistryUserOptionsDTO, RegistryUserAnalyticsDTO>
    implements RegistryUser
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
        type: RegistryUserOptionsDTO,
    })
    declare options: RegistryUserOptionsDTO;
    @ApiProperty({
        type: RegistryUserAnalyticsDTO,
    })
    declare analytics?: RegistryUserAnalyticsDTO;
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

export class RegistryUserDetailsDTO
    extends DetailsActivityDTO<
        RegistryUserDetailsItemDTO,
        RegistryUserActivityDTO
    >
    implements RegistryUserDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: RegistryUserDetailsItemDTO,
    })
    declare item?: RegistryUserDetailsItemDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: RegistryUserActivityDTO,
    })
    declare activity?: RegistryUserActivityDTO;
}
