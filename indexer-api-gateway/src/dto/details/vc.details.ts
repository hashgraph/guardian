import {
    MessageAction,
    MessageType,
    VC,
    VCAnalytics,
    VCDetails,
    VCOptions,
} from '@indexer/interfaces';
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

export class VCGridDTO
    extends MessageDTO<VCOptionsDTO, VCAnalyticsDTO>
    implements VC {
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.VC_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateVC,
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

export class VCDetailsItemDTO
    extends MessageDTO<VCOptionsDTO, VCAnalyticsDTO>
    implements VC {
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.VC_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateVC,
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
    @ApiProperty({
        description: 'Documents',
        type: 'array',
        items: {
            type: 'string',
        },
        example: [
            `"{\"id\":\"urn:uuid:229f8416-db6b-4d68-90da-38a5355126f5\",\"type\":[\"VerifiableCredential\"],\"issuer\":\"did:hedera:testnet:4dKeEsD5qLq5DB5KhA6qyh61XMHtm94FdQFTJsDYRaSa_0.0.2195223\",\"issuanceDate\":\"2024-02-02T10:06:53.300Z\",\"@context\":[\"https://www.w3.org/2018/credentials/v1\",\"ipfs://bafkreiam7a2vox6q7yweh4xsebpp4vnonasxlzcdsaxt2cicviax4f7ruq\"],\"credentialSubject\":[{\"@context\":[\"ipfs://bafkreiam7a2vox6q7yweh4xsebpp4vnonasxlzcdsaxt2cicviax4f7ruq\"],\"id\":\"did:hedera:testnet:4dKeEsD5qLq5DB5KhA6qyh61XMHtm94FdQFTJsDYRaSa_0.0.2195223\",\"type\":\"StandardRegistry\"}],\"proof\":{\"type\":\"Ed25519Signature2018\",\"created\":\"2024-02-02T10:06:53Z\",\"verificationMethod\":\"did:hedera:testnet:4dKeEsD5qLq5DB5KhA6qyh61XMHtm94FdQFTJsDYRaSa_0.0.2195223#did-root-key\",\"proofPurpose\":\"assertionMethod\",\"jws\":\"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..YElNPdCNkj8wzABUNgWYo3Yge0qrGA2KbxBWDKBzACJJe70ItIZsgbIQUHMnFbcKpXB1cSnHQ-H5WH_7uZ_3CQ\"}}"`,
        ],
    })
    declare documents: any[];
}
export class VCDetailsDTO
    extends DetailsHistoryDTO<VCDetailsItemDTO>
    implements VCDetails {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: VCDetailsItemDTO,
    })
    declare item?: VCDetailsItemDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: [VCDetailsItemDTO],
    })
    declare history?: VCDetailsItemDTO[];
    @ApiProperty({
        description: 'VC Schema',
        type: 'object',
        example: {
            $id: '#StandardRegistry',
            $comment:
                '{ "@id": "#StandardRegistry", "term": "StandardRegistry" }',
            title: 'StandardRegistry',
            description: 'StandardRegistry',
            type: 'object',
            properties: {
                '@context': {
                    oneOf: [
                        {
                            type: 'string',
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    ],
                    readOnly: true,
                },
                type: {
                    oneOf: [
                        {
                            type: 'string',
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    ],
                    readOnly: true,
                },
                id: {
                    type: 'string',
                    readOnly: true,
                },
                geography: {
                    $comment:
                        '{"term": "geography", "@id": "https://www.schema.org/text"}',
                    title: 'geography',
                    description: 'geography',
                    type: 'string',
                    readOnly: false,
                },
                law: {
                    $comment:
                        '{"term": "law", "@id": "https://www.schema.org/text"}',
                    title: 'law',
                    description: 'law',
                    type: 'string',
                    readOnly: false,
                },
                tags: {
                    $comment:
                        '{"term": "tags", "@id": "https://www.schema.org/text"}',
                    title: 'tags',
                    description: 'tags',
                    type: 'string',
                    readOnly: false,
                },
                ISIC: {
                    $comment:
                        '{"term": "ISIC", "@id": "https://www.schema.org/text"}',
                    title: 'ISIC',
                    description: 'ISIC',
                    type: 'string',
                    readOnly: false,
                },
            },
            required: ['geography', 'law', 'tags'],
            additionalProperties: false,
        },
    })
    schema?: any;
}
