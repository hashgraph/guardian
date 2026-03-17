import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Examples, ObjectExamples } from '../examples.js';
import { PolicyDTO } from './policies.dto.js';

export class ProofDTO {
    @ApiProperty({
        type: String,
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.type
    })
    type: string;

    @ApiProperty({
        type: String,
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.created
    })
    created: Date;

    @ApiProperty({
        type: String,
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.verificationMethod
    })
    verificationMethod: string;

    @ApiProperty({
        type: String,
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.proofPurpose
    })
    proofPurpose: string;

    @ApiProperty({
        type: String,
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.jws
    })
    jws: string;
}

export class VcDTO {
    @ApiProperty({
        type: String,
        example: Examples.UUID,
        nullable: true
    })
    id?: string;

    @ApiProperty({
        type: String,
        isArray: true,
        example: ObjectExamples.VC_DOCUMENT_1.document['@context']
    })
    '@context': string[];

    @ApiProperty({
        type: String,
        isArray: true,
        example: ObjectExamples.VC_DOCUMENT_1.document.type
    })
    type: string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        example: ObjectExamples.VC_DOCUMENT_1.document.credentialSubject
    })
    credentialSubject: any | any[];

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true }
        ],
        example: ObjectExamples.VC_DOCUMENT_1.document.issuer
    })
    issuer: any | string;

    @ApiProperty({
        type: String,
        required: true,
        example: ObjectExamples.VC_DOCUMENT_1.document.issuanceDate
    })
    issuanceDate: string;

    @ApiProperty({
        type: () => ProofDTO,
        nullable: true
    })
    proof?: ProofDTO;
}

export class VpDTO {
    @ApiProperty({
        type: String,
        isArray: true
    })
    '@context': string[];

    @ApiProperty({
        type: String,
        example: Examples.UUID
    })
    id: string;

    @ApiProperty({
        type: String,
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
        type: String,
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: String,
        example: 'hash'
    })
    hash?: string;

    @ApiProperty({
        type: Number,
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: String,
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
        type: String,
        example: 'Block tag'
    })
    tag?: string;

    @ApiProperty({
        type: String,
        example: 'Document type'
    })
    type?: string;

    @ApiProperty({
        type: String,
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: String,
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: String,
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
        type: String,
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: String,
        example: 'hash'
    })
    hash?: string;

    @ApiProperty({
        type: Number,
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: String,
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
        type: String,
        example: 'Block tag'
    })
    tag?: string;

    @ApiProperty({
        type: String,
        example: 'Document type'
    })
    type?: string;

    @ApiProperty({
        type: String,
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: String,
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: String,
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: String,
        example: 'ISSUE',
        required: false
    })
    hederaStatus?: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        example: {
            status: 'NEW'
        }
    })
    option?: any;

    @ApiProperty({
        type: String,
        example: Examples.ACCOUNT_ID,
        required: false
    })
    topicId?: string;

    @ApiProperty({
        type: String,
        example: Examples.MESSAGE_ID,
        required: false
    })
    messageId?: string;

    @ApiProperty({
        type: () => VcDTO,
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
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DID
    })
    did: string;

    @ApiProperty()
    vcDocument: VcDocumentDTO;

    @ApiProperty({
        type: () => PolicyDTO,
        isArray: true
    })
    policies: PolicyDTO[];

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    username: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ACCOUNT_ID
    })
    hederaAccountId: string;
}

export type AggregatedDTO = AggregatedDTOItem[]
