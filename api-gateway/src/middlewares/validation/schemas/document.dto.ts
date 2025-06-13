import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { PolicyDTO } from './policies.dto.js';

export class ProofDTO {
    @ApiProperty()
    type: string;

    @ApiProperty()
    created: Date;

    @ApiProperty()
    verificationMethod: string;

    @ApiProperty()
    proofPurpose: string;

    @ApiProperty()
    jws: string;
}

export class VcDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.UUID,
        nullable: true
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        isArray: true
    })
    '@context': string[];

    @ApiProperty({
        type: 'string',
        isArray: true
    })
    type: string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true
    })
    credentialSubject: any | any[];

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true }
        ]
    })
    issuer: any | string;

    @ApiProperty({ type: 'string', required: true })
    issuanceDate: string;

    @ApiProperty({ type: () => ProofDTO, nullable: true })
    proof?: ProofDTO;
}

export class VpDTO {
    @ApiProperty({
        type: 'string',
        isArray: true
    })
    '@context': string[];

    @ApiProperty({
        type: 'string',
        example: Examples.UUID
    })
    id: string;

    @ApiProperty({
        type: 'string',
        isArray: true
    })
    type: string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true
    })
    verifiableCredential: any[];

    @ApiProperty({
        type: () => ProofDTO,
    })
    proof?: ProofDTO;
}

@ApiExtraModels(VpDTO)
export class VpDocumentDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: 'string',
        example: 'hash'
    })
    hash?: string;

    @ApiProperty({
        type: 'number',
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: 'string',
        enum: [
            'NEW',
            'ISSUE',
            'REVOKE',
            'SUSPEND',
            'RESUME',
            'FAILED'
        ],
        example: 'NEW'
    })
    status?: string;

    @ApiProperty({
        type: 'string',
        example: 'Block tag'
    })
    tag?: string;

    @ApiProperty({
        type: 'string',
        example: 'Document type'
    })
    type?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: () => VpDTO,
    })
    document?: VpDTO[];
}

@ApiExtraModels(VcDTO)
export class VcDocumentDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: 'string',
        example: 'hash'
    })
    hash?: string;

    @ApiProperty({
        type: 'number',
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: 'string',
        enum: [
            'NEW',
            'ISSUE',
            'REVOKE',
            'SUSPEND',
            'RESUME',
            'FAILED'
        ],
        example: 'NEW'
    })
    status?: string;

    @ApiProperty({
        type: 'string',
        example: 'Block tag'
    })
    tag?: string;

    @ApiProperty({
        type: 'string',
        example: 'Document type'
    })
    type?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: () => VpDTO,
    })
    document?: VcDTO;
}

@ApiExtraModels(VcDTO)
export class ExternalDocumentDTO {
    @ApiProperty({ required: true })
    owner: string;

    @ApiProperty({ required: true })
    policyTag: string;

    @ApiProperty({ nullable: false, required: true, type: () => VcDTO })
    document: VcDTO;
}

export class AggregatedDTOItem {
    @ApiProperty()
    did: string;

    @ApiProperty()
    hederaAccountId: string;

    @ApiProperty()
    vcDocument: VcDocumentDTO;

    @ApiProperty()
    policies: PolicyDTO;
}

export type AggregatedDTO = AggregatedDTOItem[]
