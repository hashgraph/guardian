import {
    MessageAction,
    MessageType,
    VP,
    VPAnalytics,
    VPDetails,
    VPOptions,
} from '@indexer/interfaces';
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

    @ApiProperty({
        description: 'Document issuer',
    })
    issuer?: string;

    @ApiProperty({
        description: 'Token ID',
    })
    tokenId?: string;

    @ApiProperty({
        description: 'Token amount',
    })
    tokenAmount?: string;
    
    @ApiProperty({
        description: 'Label name',
    })
    labelName?: string;

    @ApiProperty({
        description: 'Label IDs',
    })
    labels?: string[];
}

export class VPGridDTO
    extends MessageDTO<VPOptionsDTO, VPAnalyticsDTO>
    implements VP
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.VP_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateVP,
    })
    declare action: MessageAction;
    @ApiProperty({
        type: VPOptionsDTO,
    })
    declare options: VPOptionsDTO;
}

export class VPDetailsItemDTO
    extends MessageDTO<VPOptionsDTO, VPAnalyticsDTO>
    implements VP
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.VP_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateVP,
    })
    declare action: MessageAction;
    @ApiProperty({
        type: VPOptionsDTO,
    })
    declare options: VPOptionsDTO;
    @ApiProperty({
        type: VPAnalyticsDTO,
    })
    declare analytics?: VPAnalyticsDTO;
    @ApiProperty({
        description: 'Documents',
        type: 'array',
        items: {
            type: 'string',
        },
        example: [
            `"{\"id\":\"urn:uuid:2c374b67-fda5-4023-97c2-c0782624573f\",\"type\":[\"VerifiablePresentation\"],\"@context\":[\"https://www.w3.org/2018/credentials/v1\"],\"verifiableCredential\":[{\"id\":\"urn:uuid:ff0aecbd-d358-4e5b-b99b-7a87ba38a3b2\",\"type\":[\"VerifiableCredential\"],\"issuer\":\"did:hedera:testnet:C5YaWT128KGmtivag99VbSeKrzxP8P8H7FbL2KQ9VQEB_0.0.1533438\",\"issuanceDate\":\"2024-02-06T05:40:37.795Z\",\"@context\":[\"https://www.w3.org/2018/credentials/v1\",\"ipfs://bafkreib6arvz7hltf2yqoyb7iqlkrojur7lqqcsuuhvcfvyrtkncm6pqhi\"],\"credentialSubject\":[{\"finalMintAmount\":5,\"policyId\":\"65bc691d2ae9d0f1ef2db3bc\",\"ref\":\"urn:uuid:11b1ad6f-8b4f-4d61-a63a-cc9e6532625f\",\"@context\":[\"ipfs://bafkreib6arvz7hltf2yqoyb7iqlkrojur7lqqcsuuhvcfvyrtkncm6pqhi\"],\"id\":\"urn:uuid:5d253a1d-456a-4fb1-8b45-257e1db2e668\",\"type\":\"601a68c4-66c3-407c-bc88-1b5841e6d1da&1.0.0\"}],\"proof\":{\"type\":\"Ed25519Signature2018\",\"created\":\"2024-02-06T05:40:37Z\",\"verificationMethod\":\"did:hedera:testnet:C5YaWT128KGmtivag99VbSeKrzxP8P8H7FbL2KQ9VQEB_0.0.1533438#did-root-key\",\"proofPurpose\":\"assertionMethod\",\"jws\":\"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..UvTeKVUVUxH1SFNNoyu_VXf4kFqDIFzFPJaaq5adiSHrBePLQMQv7dM_Fq23z7UGHSmXlodBen1Ujcdi-am5DQ\"}},{\"id\":\"urn:uuid:b76fbd72-48b7-45fb-b152-7ec13d11eafb\",\"type\":[\"VerifiableCredential\"],\"issuer\":\"did:hedera:testnet:C5YaWT128KGmtivag99VbSeKrzxP8P8H7FbL2KQ9VQEB_0.0.1533438\",\"issuanceDate\":\"2024-02-06T05:40:45.066Z\",\"@context\":[\"https://www.w3.org/2018/credentials/v1\",\"ipfs://bafkreigd6nhj5auxobzu4qzlakzcaizh6wux2gq43qft4rwpri7msn2geu\"],\"credentialSubject\":[{\"date\":\"2024-02-06T05:40:45.021Z\",\"tokenId\":\"0.0.1621155\",\"amount\":\"5\",\"@context\":[\"ipfs://bafkreigd6nhj5auxobzu4qzlakzcaizh6wux2gq43qft4rwpri7msn2geu\"],\"type\":\"MintToken\"}],\"proof\":{\"type\":\"Ed25519Signature2018\",\"created\":\"2024-02-06T05:40:45Z\",\"verificationMethod\":\"did:hedera:testnet:C5YaWT128KGmtivag99VbSeKrzxP8P8H7FbL2KQ9VQEB_0.0.1533438#did-root-key\",\"proofPurpose\":\"assertionMethod\",\"jws\":\"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..5hWYO3NA0Q9zI0oS1lLOpofQI-DTQVM0sd4GUQV-UUSlBug3EgYYBm7247LCzlCRt9VpYsUh7SxIrsgHzsSRDA\"}}],\"proof\":{\"type\":\"Ed25519Signature2018\",\"created\":\"2024-02-06T05:40:45Z\",\"verificationMethod\":\"did:hedera:testnet:C5YaWT128KGmtivag99VbSeKrzxP8P8H7FbL2KQ9VQEB_0.0.1533438#did-root-key\",\"proofPurpose\":\"authentication\",\"challenge\":\"123\",\"jws\":\"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..Mu5BaQ34idnqG6d-aMqufQOXcuWHMkv6N9Z2zhBi9Yfd7jU9FFkwi-Xjyf-Kastr7vVWBNLwGxB-bPRf4UEHAg\"}}"`,
        ],
    })
    declare documents: any[];
}

export class VPDetailsDTO
    extends DetailsHistoryDTO<VPDetailsItemDTO>
    implements VPDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;

    @ApiProperty({
        type: VPDetailsItemDTO,
    })
    declare item?: VPDetailsItemDTO;

    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;

    @ApiProperty({
        type: [VPDetailsItemDTO],
    })
    declare history?: VPDetailsItemDTO[];

    @ApiProperty({
        type: [VPDetailsItemDTO],
    })
    declare labels?: VPDetailsItemDTO[];
}
