import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Examples, ObjectExamples } from '../examples.js';
import { PolicyDTO } from './policies.dto.js';

export class ProofDTO {
    @ApiProperty({
        type: String,
        description: 'Cryptographic signature type (e.g. Ed25519Signature2018)',
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.type
    })
    type: string;

    @ApiProperty({
        type: String,
        description: 'Date and time the proof was created',
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.created
    })
    created: Date;

    @ApiProperty({
        type: String,
        description: 'DID URL of the key used for signing',
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.verificationMethod
    })
    verificationMethod: string;

    @ApiProperty({
        type: String,
        description: 'Purpose of the proof (e.g. assertionMethod)',
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.proofPurpose
    })
    proofPurpose: string;

    @ApiProperty({
        type: String,
        description: 'JSON Web Signature value',
        example: ObjectExamples.VC_DOCUMENT_1.document.proof.jws
    })
    jws: string;
}

export class VcDTO {
    @ApiProperty({
        type: String,
        description: 'Verifiable Credential unique identifier (URN)',
        example: Examples.UUID,
        nullable: true
    })
    id?: string;

    @ApiProperty({
        type: String,
        description: 'JSON-LD context URIs defining the credential vocabulary',
        isArray: true,
        example: ObjectExamples.VC_DOCUMENT_1.document['@context']
    })
    '@context': string[];

    @ApiProperty({
        type: String,
        description: 'Credential type(s), always includes VerifiableCredential',
        isArray: true,
        example: ObjectExamples.VC_DOCUMENT_1.document.type
    })
    type: string[];

    @ApiProperty({
        type: 'object',
        description: 'Claims about the credential subject',
        additionalProperties: true,
        isArray: true,
        example: ObjectExamples.VC_DOCUMENT_1.document.credentialSubject
    })
    credentialSubject: any | any[];

    @ApiProperty({
        description: 'DID of the credential issuer (string or object with id field)',
        oneOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true }
        ],
        example: ObjectExamples.VC_DOCUMENT_1.document.issuer
    })
    issuer: any | string;

    @ApiProperty({
        type: String,
        description: 'ISO 8601 date when the credential was issued',
        required: true,
        example: ObjectExamples.VC_DOCUMENT_1.document.issuanceDate
    })
    issuanceDate: string;

    @ApiProperty({
        type: () => ProofDTO,
        description: 'Cryptographic proof of the credential',
        nullable: true
    })
    proof?: ProofDTO;
}

export class VpDTO {
    @ApiProperty({
        type: String,
        description: 'JSON-LD context URIs',
        isArray: true
    })
    '@context': string[];

    @ApiProperty({
        type: String,
        description: 'Verifiable Presentation unique identifier (URN)',
        example: Examples.UUID
    })
    id: string;

    @ApiProperty({
        type: String,
        description: 'Presentation type(s), always includes VerifiablePresentation',
        isArray: true
    })
    type: string[];

    @ApiProperty({
        type: 'object',
        description: 'Array of Verifiable Credentials included in this presentation',
        additionalProperties: true,
        isArray: true
    })
    verifiableCredential: any[];

    @ApiProperty({
        type: () => ProofDTO,
        description: 'Cryptographic proof of the presentation',
    })
    proof?: ProofDTO;
}

@ApiExtraModels(VpDTO)
export class VpDocumentDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Database ID of the policy this VP belongs to',
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: String,
        description: 'Document content hash for integrity verification',
        example: Examples.HASH
    })
    hash?: string;

    @ApiProperty({
        type: Number,
        description: 'Number of signatures on this document',
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: String,
        description: 'Hedera DLT status of the document',
        enum: [
            'NEW',
            'ISSUE',
            'REVOKE',
            'SUSPEND',
            'RESUME',
            'FAILED'
        ],
        example: 'ISSUE'
    })
    status?: string;

    @ApiProperty({
        type: String,
        description: 'Policy block tag that created this document',
        example: 'mint_token'
    })
    tag?: string;

    @ApiProperty({
        type: String,
        description: 'Document type identifier',
        example: 'VP'
    })
    type?: string;

    @ApiProperty({
        type: String,
        description: 'Document creation date in ISO 8601 format',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the document owner',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: () => VpDTO,
        description: 'Raw Verifiable Presentation document(s)',
    })
    document?: VpDTO[];
}

@ApiExtraModels(VcDTO)
export class VcDocumentDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Database ID of the policy this VC belongs to',
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: String,
        description: 'Document content hash for integrity verification',
        example: Examples.HASH
    })
    hash?: string;

    @ApiProperty({
        type: Number,
        description: 'Number of signatures on this document',
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: String,
        description: 'Hedera DLT status of the document',
        enum: [
            'NEW',
            'ISSUE',
            'REVOKE',
            'SUSPEND',
            'RESUME',
            'FAILED'
        ],
        example: 'ISSUE'
    })
    status?: string;

    @ApiProperty({
        type: String,
        description: 'Policy block tag that created this document',
        example: 'create_vc'
    })
    tag?: string;

    @ApiProperty({
        type: String,
        description: 'Document type identifier (e.g. STANDARD_REGISTRY, USER)',
        example: 'STANDARD_REGISTRY'
    })
    type?: string;

    @ApiProperty({
        type: String,
        description: 'Document creation date in ISO 8601 format',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the document owner',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera consensus status of the document',
        example: 'ISSUE',
        required: false
    })
    hederaStatus?: string;

    @ApiProperty({
        type: 'object',
        description: 'Additional document options (e.g. approval status)',
        additionalProperties: true,
        example: {
            status: 'NEW'
        }
    })
    option?: any;

    @ApiProperty({
        type: String,
        description: 'Hedera topic ID the document was published to',
        example: Examples.ACCOUNT_ID,
        required: false
    })
    topicId?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera message ID of the published document',
        example: Examples.MESSAGE_ID,
        required: false
    })
    messageId?: string;

    @ApiProperty({
        type: () => VcDTO,
        description: 'Raw Verifiable Credential document',
    })
    document?: VcDTO;
}

@ApiExtraModels(VcDTO)
export class ExternalDocumentDTO {
    @ApiProperty({ description: 'DID of the document owner', required: true })
    owner: string;

    @ApiProperty({ description: 'Policy tag to submit the document to', required: true })
    policyTag: string;

    @ApiProperty({ description: 'Verifiable Credential document', nullable: false, required: true, type: () => VcDTO })
    document: VcDTO;
}

export class AggregatedDTOItem {
    @ApiProperty({
        type: String,
        description: 'DID of the Standard Registry',
        required: true,
        example: Examples.DID
    })
    did: string;

    @ApiProperty({
        description: 'Standard Registry Verifiable Credential document',
    })
    vcDocument: VcDocumentDTO;

    @ApiProperty({
        type: () => PolicyDTO,
        description: 'List of policies owned by this Standard Registry',
        isArray: true
    })
    policies: PolicyDTO[];

    @ApiProperty({
        type: String,
        description: 'Username of the Standard Registry',
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    username: string;

    @ApiProperty({
        type: String,
        description: 'Hedera account ID of the Standard Registry',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    hederaAccountId: string;
}

export type AggregatedDTO = AggregatedDTOItem[]
