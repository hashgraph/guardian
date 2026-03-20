import { ApiProperty } from '@nestjs/swagger';
import {
    ContractType,
    IContract,
    IRetirePool,
    IRetireRequest,
    RetireTokenPool,
    RetireTokenRequest,
    TokenType,
} from '@guardian/interfaces';
import { Examples } from '../examples.js';

export class ImportContractDTO {
    @ApiProperty({
        type: String,
        description: 'Hedera contract identifier',
        example: Examples.ACCOUNT_ID
    })
    contractId: string;

    @ApiProperty({
        type: String,
        description: 'Contract description',
        required: false
    })
    description?: string;
}

export class ContractConfigDTO {
    @ApiProperty({
        enum: ContractType,
        required: true,
        example: ContractType.WIPE
    })
    type: ContractType;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Contract description'
    })
    description: string;
}

export class ContractDTO implements IContract {
    @ApiProperty({
        type: String,
        format: 'date-time',
        description: 'Record creation time (from persistence layer).',
        example: Examples.DATE
    })
    createDate?: Date;

    @ApiProperty({
        type: String,
        format: 'date-time',
        description: 'Record last update time (from persistence layer).',
        example: Examples.DATE
    })
    updateDate?: Date;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    id: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ACCOUNT_ID
    })
    contractId: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'Contract description'
    })
    description?: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DID
    })
    owner: string;

    @ApiProperty({
        type: Number,
        required: true,
        description:
            'Bitmask of caller roles (values are additive): 1 = Owner, 2 = Admin, 4 = Manager (WIPE only), 8 = Wiper (WIPE v1.0.0 only). E.g. 3 = Owner+Admin (RETIRE), 7 = Owner+Admin+Manager (WIPE).',
        example: 7
    })
    permissions: number;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ACCOUNT_ID
    })
    topicId: string;

    @ApiProperty({
        enum: ContractType,
        required: true,
        example: ContractType.WIPE
    })
    type: ContractType;

    @ApiProperty({
        type: Date,
        required: false,
        description: 'Last sync of retire pools (may be absent).',
        example: Examples.DATE
    })
    syncPoolsDate?: Date;

    @ApiProperty({
        type: String,
        required: false,
        description: 'Hedera consensus timestamp string from last processed contract event.',
        example: '1773997659.461000723'
    })
    lastSyncEventTimeStamp?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        description: 'When true, automatic sync is disabled for this contract.',
        example: false
    })
    syncDisabled?: boolean;

    @ApiProperty({
        type: String,
        required: false,
        description: 'Deployed contract ABI / behavior version.',
        example: '1.0.1'
    })
    version?: string;

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'Legacy: linked WIPE contract Hedera ids (contract-level wiper). Often empty for `version` 1.0.1+; see `wipeTokenIds` instead.',
        example: []
    })
    wipeContractIds: string[];

    @ApiProperty({
        type: [String],
        required: false,
        description:
            'Token-level wiper allowlist (Hedera token ids). Typical for RETIRE contracts with `version` 1.0.1+; usually empty for WIPE contracts.',
        example: ['0.0.8300593']
    })
    wipeTokenIds: string[];
}

export class WiperRequestDTO {
    @ApiProperty({
        type: String,
        format: 'date-time',
        description: 'Record creation time.',
        example: Examples.DATE
    })
    createDate?: Date;

    @ApiProperty({
        type: String,
        format: 'date-time',
        description: 'Record last update time.',
        example: Examples.DATE
    })
    updateDate?: Date;

    @ApiProperty({ required: true, example: Examples.ACCOUNT_ID })
    contractId: string;

    @ApiProperty({ required: true, description: 'Hedera account id of the requester.', example: Examples.ACCOUNT_ID })
    user: string;

    @ApiProperty({
        required: false,
        description: 'Hedera token id.',
        example: Examples.ACCOUNT_ID
    })
    token?: string;

    @ApiProperty({ required: true, example: Examples.DB_ID })
    id: string;
}

export class RetireRequestDTO implements IRetireRequest {
    @ApiProperty({ required: true })
    id: string;
    @ApiProperty({ required: true })
    contractId: string;
    @ApiProperty({
        required: ['token', 'count', 'serials', 'decimals', 'type', 'tokenSymbol'],
        type: 'object',
        properties: {
            token: {
                type: 'string',
            },
            count: {
                type: 'number',
            },
            serials: {
                type: 'array',
                items: {
                    type: 'number',
                },
            },
            decimals: {
                type: 'number',
            },
            type: {
                enum: ['non-fungible', 'fungible'],
            },
            tokenSymbol: {
                type: 'string',
            },
        }
    })
    tokens: (RetireTokenRequest & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
    })[];
    @ApiProperty({ required: true })
    tokenIds: string[];
    @ApiProperty({ required: true })
    user: string;
}

export class RetirePoolDTO implements IRetirePool {
    @ApiProperty({ required: false, format: 'date-time', description: 'Record creation time.' })
    createDate?: string;

    @ApiProperty({ required: false, format: 'date-time', description: 'Record last update time.' })
    updateDate?: string;

    @ApiProperty({ required: true })
    id: string;

    @ApiProperty({ required: true })
    contractId: string;

    @ApiProperty({
        required: ['token', 'contract', 'count', 'decimals', 'type', 'tokenSymbol'],
        type: 'object',
        properties: {
            token: { type: 'string', description: 'Hedera token id.' },
            contract: { type: 'string', description: 'Wipe contract id.' },
            count: { type: 'number', description: 'Token count in pool.' },
            decimals: { type: 'number', description: 'Token decimals.' },
            type: { type: 'string', enum: ['non-fungible', 'fungible'] },
            tokenSymbol: { type: 'string', description: 'Token symbol.' },
        },
    })
    tokens: (RetireTokenPool & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
        contract: string;
    })[];

    @ApiProperty({ required: true, type: [String], description: 'Token ids in pool.' })
    tokenIds: string[];

    @ApiProperty({ required: true, description: 'Retire immediately without approval.' })
    immediately: boolean;

    @ApiProperty({ required: true, description: 'Pool is enabled.' })
    enabled: boolean;
}

export class RetireRequestTokenDTO implements RetireTokenRequest {
    @ApiProperty({ required: true })
    token: string;
    @ApiProperty({
        required: true,
        description: 'For FT: amount to retire. For NFT: keep `0`.',
        example: 1
    })
    count: number;
    @ApiProperty({
        required: true,
        description: 'For NFT: serial numbers to retire. For FT: use empty array.',
        example: []
    })
    serials: number[];
}

export class RetireRequestTokenFTDTO {
    @ApiProperty({ required: true, example: '0.0.8300593' })
    token: string;

    @ApiProperty({ required: true, example: 1 })
    count: number;

    @ApiProperty({
        required: true,
        type: [Number],
        description: 'Use empty array for FT retire request.',
        example: []
    })
    serials: number[];
}

export class RetireRequestTokenNFTDTO {
    @ApiProperty({ required: true, example: '0.0.8300593' })
    token: string;

    @ApiProperty({
        required: true,
        description: 'Required; use `0` for NFT retire request.',
        example: 0
    })
    count: number;

    @ApiProperty({
        required: true,
        type: [Number],
        description: 'NFT serial numbers to retire.',
        example: [1]
    })
    serials: number[];
}

export class RetirePoolTokenDTO implements RetireTokenPool {
    @ApiProperty({ required: true })
    token: string;
    @ApiProperty({ required: true })
    count: number;
}

/** Retire credential subject token (NFT: count=0, serials; FT: count>0, serials=[]) */
export class RetireVcTokenDTO {
    @ApiProperty({ description: 'Hedera token id', example: '0.0.8308164' })
    tokenId: string;
    @ApiProperty({ description: 'For FT: amount. For NFT: 0', example: 3 })
    count: number;
    @ApiProperty({ description: 'For NFT: serial numbers. For FT: empty', example: [2, 3, 4, 10], type: [Number] })
    serials: number[];
}

/** Retire VC proof (document.proof) */
export class RetireVcProofDTO {
    @ApiProperty({ example: 'Ed25519Signature2018' })
    type: string;
    @ApiProperty({ example: '2026-03-20T18:36:34Z' })
    created: string;
    @ApiProperty({ example: 'did:hedera:testnet:..._0.0.8299835#did-root-key' })
    verificationMethod: string;
    @ApiProperty({ example: 'assertionMethod' })
    proofPurpose: string;
    @ApiProperty({ example: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..f71046hE9geZXL7uPc5EIc2YsNGMWsRakFwN_iMht4O6njdQZPtKckkQ6H9P1pZBaRz-_yaAy-gmfO-I3LJDBw' })
    jws: string;
}

/** Retire credential subject (document.credentialSubject[0]) */
export class RetireCredentialSubjectDTO {
    @ApiProperty({ description: 'Subject DID', example: Examples.DID })
    id: string;
    @ApiProperty({ description: 'User Hedera account id', example: '0.0.6057669' })
    user: string;
    @ApiProperty({ description: 'Retire contract id', example: '0.0.8308132' })
    contractId: string;
    @ApiProperty({ type: [RetireVcTokenDTO], description: 'Retired tokens' })
    tokens: RetireVcTokenDTO[];
    @ApiProperty({ example: 'Retire' })
    type: string;
}

/** Retire VC document body (document field) */
export class RetireVcDocumentBodyDTO {
    @ApiProperty({ example: 'urn:uuid:93328f13-cac2-49a8-9c30-fb52842093dd' })
    id?: string;
    @ApiProperty({ type: [String], example: ['VerifiableCredential'] })
    type?: string[];
    @ApiProperty({ example: Examples.DID })
    issuer?: string;
    @ApiProperty({ example: '2026-03-20T18:36:34.285Z' })
    issuanceDate?: string;
    @ApiProperty({ type: [RetireCredentialSubjectDTO], description: 'Credential subjects' })
    credentialSubject?: RetireCredentialSubjectDTO[];
    @ApiProperty({ type: RetireVcProofDTO })
    proof?: RetireVcProofDTO;
}

/** Retire VC document (lightweight schema for GET /contracts/retire) */
export class RetireVcDocumentDTO {
    @ApiProperty({ format: 'date-time', example: '2026-03-20T18:36:53.698Z' })
    createDate?: string;
    @ApiProperty({ format: 'date-time', example: '2026-03-20T18:36:53.698Z' })
    updateDate?: string;
    @ApiProperty({ example: '88chLeeXjKUXa13dNeEJz2tNehsjo3HQGUX5QH3kmY6b' })
    hash?: string;
    @ApiProperty({ example: 'NEW', description: 'Hedera document status' })
    hederaStatus?: string;
    @ApiProperty({ example: 0 })
    signature?: number;
    @ApiProperty({ example: 'RETIRE' })
    type?: string;
    @ApiProperty({ example: { status: 'NEW' } })
    option?: { status: string };
    @ApiProperty({ example: Examples.DID })
    owner?: string;
    @ApiProperty({
        type: RetireVcDocumentBodyDTO,
        description: 'VerifiableCredential with credentialSubject (user, contractId, tokens)'
    })
    document?: RetireVcDocumentBodyDTO;
    @ApiProperty({ example: Examples.DB_ID })
    documentFileId?: string;
    @ApiProperty({ type: [String], example: ['credentialSubject.0.user'] })
    documentFields?: string[];
    @ApiProperty({ type: [String], example: [] })
    tableFileIds?: string[];
    @ApiProperty({ example: Examples.DB_ID })
    id?: string;
}

/** Retire VC from Indexer (GET /contracts/retireIndexer response) */
export class RetireVcIndexerDocumentDTO {
    @ApiProperty({ example: '66ee387945ab8bf9448f45e2' })
    id?: string;
    @ApiProperty({ example: 0 })
    lastUpdate?: number;
    @ApiProperty({ description: 'Contract topic id', example: '0.0.4641052' })
    topicId?: string;
    @ApiProperty({ example: '1722418989.344504535' })
    consensusTimestamp?: string;
    @ApiProperty({ example: '0.0.1416' })
    owner?: string;
    @ApiProperty({ example: '8494b750-eed6-4d13-82a1-5cc1a644ffae' })
    uuid?: string;
    @ApiProperty({ example: 'ISSUE' })
    status?: string;
    @ApiProperty({ example: 'VC-Document' })
    type?: string;
    @ApiProperty({ example: 'create-vc-document' })
    action?: string;
    @ApiProperty({ example: 'en-US' })
    lang?: string;
    @ApiProperty({ example: 'str' })
    responseType?: string;
    @ApiProperty({
        example: {
            issuer: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363',
            relationships: null,
            documentStatus: null,
            encodedData: false
        }
    })
    options?: { issuer?: string; relationships?: string[] | null; documentStatus?: string | null; encodedData?: boolean };
    @ApiProperty({
        example: {
            textSearch: '0.0.4641052|0.0.1416|1722418989.344504535|...',
            schemaId: '1743436678.828522000',
            schemaName: 'Retire'
        }
    })
    analytics?: { textSearch?: string; schemaId?: string; schemaName?: string };
    @ApiProperty({ example: 1773995161141 })
    analyticsUpdate?: number;
    @ApiProperty({ example: 1756843304325 })
    coordUpdate?: number;
    @ApiProperty({ type: [String], example: ['bafkreihwnas7c7ji53iolrjkjuqevqdg2j6je2supras5vghzjq5ccnyai'] })
    files?: string[];
    @ApiProperty({
        type: [RetireVcDocumentBodyDTO],
        description: 'Retire VC documents with credentialSubject (user, contractId, tokens)'
    })
    documents?: RetireVcDocumentBodyDTO[];
    @ApiProperty({ type: [String], example: [] })
    topics?: string[];
    @ApiProperty({ type: [String], example: [] })
    tokens?: string[];
    @ApiProperty({ example: 3 })
    sequenceNumber?: number;
    @ApiProperty({ example: true })
    loaded?: boolean;
}
