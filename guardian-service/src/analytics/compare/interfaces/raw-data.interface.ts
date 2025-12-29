import { ObjectId } from "bson";

/**
 * Schema data types
 */
export enum SchemaDataTypes {
    string = 'string',
    number = 'number',
    integer = 'integer',
    boolean = 'boolean',
    null = 'null',
    object = 'object',
    array = 'array',
}

/**
 * Schema data formats
 */
export enum SchemaDataFormat {
    date = 'date',
    time = 'time',
    dateTime = 'date-time',
    duration = 'duration',
    uri = 'uri',
    email = 'email',
    ipv4 = 'ipv4',
    ipv6 = 'ipv6',
    regex = 'regex',
    uuid = 'uuid'
}

/**
 * Schema document interface
 */
export interface ISchemaDocument {
    /**
     * ID
     */
    $id?: string;
    /**
     * Comment
     */
    $comment?: string;
    /**
     * Title
     */
    title?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Type
     */
    type?: SchemaDataTypes;
    /**
     * Format
     */
    format?: SchemaDataFormat;
    /**
     * Pattern
     */
    pattern?: string;
    /**
     * Is readonly
     */
    readOnly?: boolean;
    /**
     * Unit
     */
    unit?: string;
    /**
     * Unit system
     */
    unitSystem?: string;
    /**
     * Properties
     */
    properties?: {
        [x: string]: ISchemaDocument;
    }
    /**
     * Required fields
     */
    required?: string[];
    /**
     * Hidden fields
     */
    hidden?: string[];
    /**
     * Additional properties
     */
    additionalProperties?: boolean;
    /**
     * Definitions
     */
    $defs?: {
        [x: string]: ISchemaDocument;
    }
    /**
     * Reference
     */
    $ref?: string;
    /**
     * Document items
     */
    items?: ISchemaDocument;
    /**
     * OneOf
     */
    oneOf?: ISchemaDocument[];
    /**
     * AllOf
     */
    allOf?: any[];
}

/**
 * Event raw data
 */
export interface IBlockEventRawData {
    actor?: string;
    disabled?: boolean;
    input?: string;
    output?: string;
    source?: string;
    target?: string;
}

/**
 * Artifact raw data
 */
export interface IBlockArtifactRawData {
    name?: string;
    uuid?: string;
    type?: string;
    extention?: string;
}

/**
 * Block raw data
 */
export interface IBlockRawData {
    blockType?: string;
    tag?: string;
    children?: IBlockRawData[];
    events?: IBlockEventRawData[];
    artifacts?: IBlockArtifactRawData[];
    permissions?: string;
    [prop: string]: any;
}

/**
 * Policy raw data
 */
export interface IPolicyRawData {
    id?: string;
    name?: string;
    description?: string;
    instanceTopicId?: string;
    version?: string;
    config?: IBlockRawData;
    tools?: string[];
    policyRoles?: string[];
    policyGroups?: string[];
    policyTopics?: string[];
    policyTokens?: string[];
    originalZipId?: ObjectId;
    originalMessageId?: string;
}

/**
 * Schema raw data
 */
export interface ISchemaRawData {
    id?: string;
    name?: string;
    uuid?: string;
    description?: string;
    topicId?: string;
    version?: string;
    sourceVersion?: string;
    iri?: string;
    document?: string | ISchemaDocument;
}

/**
 * Tool raw data
 */
export interface IToolRawData {
    id?: string;
    name?: string;
    description?: string;
    hash?: string;
    messageId?: string;
    config?: IBlockRawData;
}

/**
 * Module raw data
 */
export interface IModuleRawData {
    id?: string;
    name?: string;
    description?: string;
    config?: IBlockRawData;
}

/**
 * Artifact raw data
 */
export interface IArtifactRawData {
    name?: string;
    uuid?: string;
    extention?: string;
    data?: Buffer;
}

/**
 * Token raw data
 */
export interface ITokenRawData {
    id?: string;
    tokenId?: string;
    tokenName?: string;
    tokenSymbol?: string;
    tokenType?: string;
    decimals?: number;
    initialSupply?: number;
    enableAdmin?: boolean;
    enableFreeze?: boolean;
    enableKYC?: boolean;
    enableWipe?: boolean;
    adminKey?: string;
    freezeKey?: string;
    kycKey?: string;
    wipeKey?: string;
}

/**
 * Policy data
 */
export interface IPolicyData {
    type: string;
    policy: IPolicyRawData;
    schemas: ISchemaRawData[];
    tokens: ITokenRawData[];
    artifacts: IArtifactRawData[];
}

/**
 * Tool data
 */
export interface IToolData {
    tool: IToolRawData;
    schemas: ISchemaRawData[];
    artifacts: IArtifactRawData[];
}

/**
 * Tool data
 */
export interface ISchemaData {
    schema: ISchemaRawData;
    policy: IPolicyRawData;
}

/**
 * Vc data
 */
export interface IVCData {
    type: 'VC';
    document: IVcDocument;
}

/**
 * Vp data
 */
export interface IVPData {
    type: 'VP';
    document: IVpDocument;
}

/**
 * Any document data
 */
export type IDocumentData = IVCData | IVPData;

/**
 * Credential subject interface
 */
export interface ICredentialSubject {
    /**
     * DID
     */
    id?: string;
    /**
     * Type
     */
    type?: string;
    /**
     * Geography
     */
    geography?: string;
    /**
     * Law
     */
    law?: string;
    /**
     * Tags
     */
    tags?: string;
    /**
     * ISIC
     */
    ISIC?: string;
    /**
     * Subject context
     */
    '@context': string | string[];
    [x: string]: any;
}

/**
 * VC interface
 */
export interface IVC {
    /**
     * Context
     */
    '@context': string[];
    /**
     * ID
     */
    id: string;
    /**
     * Type
     */
    type: string[];
    /**
     * Credential Subject
     */
    credentialSubject: ICredentialSubject[];
    /**
     * Issuer
     */
    issuer: string | {
        /**
         * Issuer
         */
        id: string;
    };
    /**
     * Issuance Date
     */
    issuanceDate: string;
    /**
     * Proof
     */
    proof?: any;
}

/**
 * VP interface
 */
export interface IVP {
    /**
     * Context
     */
    '@context': string[];
    /**
     * ID
     */
    id: string;
    /**
     * Type
     */
    type: string[];
    /**
     * VC instance
     */
    verifiableCredential: IVC[];
    /**
     * Proof
     */
    proof?: any;
}

/**
 * VC documents collection
 */
export interface IVcDocument {
    /**
     * Document id
     */
    id?: string;
    /**
     * Document owner
     */
    owner?: string;
    /**
     * Assign
     */
    assignedTo?: string;
    /**
     * Assign
     */
    assignedToGroup?: string;
    /**
     * Document hash
     */
    hash?: string;
    /**
     * Document instance
     */
    document?: IVC;
    /**
     * Document fields
     */
    documentFields?: string[];
    /**
     * Document hedera status
     */
    hederaStatus?: string;
    /**
     * Document signature
     */
    signature?: number;
    /**
     * Document processing status
     */
    processingStatus?: string;
    /**
     * Type
     */
    type?: string;
    /**
     * Policy id
     */
    policyId?: string;
    /**
     * Tag
     */
    tag?: string;
    /**
     * Document option
     */
    option?: any;
    /**
     * Document schema
     */
    schema?: string;
    /**
     * Message id
     */
    messageId?: string;
    /**
     * Topic id
     */
    topicId?: string;
    /**
     * Relationships
     */
    relationships?: string[];
    /**
     * Comment
     */
    comment?: string;
    /**
     * Hedera Accounts
     */
    accounts?: any;
    /**
     * Tokens
     */
    tokens?: any;
    /**
     * User group
     */
    group?: any;
    /**
     * Hedera Hash
     */
    messageHash?: string;
    /**
     * Message History
     */
    messageIds?: string[];
}

/**
 * VP documents collection
 */
export interface IVpDocument {
    /**
     * Document id
     */
    id?: string;
    /**
     * Document owner
     */
    owner?: string;
    /**
     * Document hash
     */
    hash?: string;
    /**
     * Document instance
     */
    document?: IVP;
    /**
     * Document fields
     */
    documentFields?: string[];
    /**
     * Document status
     */
    status?: string;
    /**
     * Document signature
     */
    signature?: number;
    /**
     * Document type
     */
    type?: string;
    /**
     * Policy id
     */
    policyId?: string;
    /**
     * Tag
     */
    tag?: string;
    /**
     * Message id
     */
    messageId?: string;
    /**
     * Topic id
     */
    topicId?: string;
    /**
     * Relationships
     */
    relationships?: string[];
    /**
     * Option
     */
    option?: any;
    /**
     * Comment
     */
    comment?: string;
    /**
     * Hedera Hash
     */
    messageHash?: string;
    /**
     * Message History
     */
    messageIds?: string[];
    /**
     * Token amount
     */
    amount?: any;
    /**
     * Token serials
     */
    serials?: any;
    /**
     * Token Id
     */
    tokenId?: any;
}

/**
 * Record result
 */
export interface IRecordResult {
    /**
     * Document ID
     */
    id: string;
    /**
     * Document type
     */
    type: 'vc' | 'vp' | 'schema';
    /**
     * Document body (JSON)
     */
    document: any;
}