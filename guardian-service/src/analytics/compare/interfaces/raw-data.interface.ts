import { ISchemaDocument } from "@guardian/interfaces";

/**
 * 
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
 * 
 */
export interface IBlockArtifactRawData {
    name?: string;
    uuid?: string;
    type?: string;
    extention?: string;
}

/**
 * 
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
 * 
 */
export interface IPolicyRawData {
    id?: string;
    name?: string;
    description?: string;
    instanceTopicId?: string;
    version?: string;
    config?: IBlockRawData;
    policyRoles?: string[];
    policyGroups?: string[];
    policyTopics?: string[];
    policyTokens?: string[];
}

/**
 * 
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
 * 
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
 * 
 */
export interface IArtifactRawData {
    name?: string;
    uuid?: string;
    extention?: string;
    data?: Buffer;
}

/**
 * 
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
 * 
 */
export interface IPolicyData {
    policy: IPolicyRawData;
    schemas: ISchemaRawData[];
    tokens: ITokenRawData[];
    artifacts: IArtifactRawData[];
}
