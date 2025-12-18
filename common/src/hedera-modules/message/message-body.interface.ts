import { ContractType, MultiPolicyType } from '@guardian/interfaces';
import { MessageStatus } from './message.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';

/**
 * Message body
 */
export interface MessageBody {
    /**
     * ID
     */
    id: string;
    /**
     * Status
     */
    status: MessageStatus;
    /**
     * Message type
     */
    type: MessageType;
    /**
     * Message action
     */
    action: MessageAction;
    /**
     * Message lang
     */
    lang: string;
    /**
     * Account
     */
    account: string;
    /**
     * Revoke message
     */
    revokeMessage?: string;
    /**
     * Message reason
     */
    reason?: string;
    /**
     * Parent IDs
     */
    parentIds?: string[];
    /**
     * Delete message
     */
    deleteMessage?: string;
    /**
     * Status message
     */
    statusMessage?: string;
}

/**
 * DID message body
 */
export interface DidMessageBody extends MessageBody {
    /**
     * DID
     */
    did: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Relationships
     */
    relationships?: string[];
}

/**
 * Policy message body
 */
export interface PolicyMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Topic description
     */
    topicDescription: string;
    /**
     * Version
     */
    version: string;
    /**
     * Policy tag
     */
    policyTag: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Topic id
     */
    topicId: string;
    /**
     * Instance topic ID
     */
    instanceTopicId: string;
    /**
     * Synchronization topic ID
     */
    synchronizationTopicId: string;
    /**
     * Availability
     */
    availability: string;
    /**
     * restoreTopicId
     */
    restoreTopicId: string;
    /**
     * actionsTopicId
     */
    actionsTopicId: string;
    /**
     * commentsTopicId
     */
    commentsTopicId: string;
    /**
     * Effective Date
     */
    effectiveDate?: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * Schema message body
 */
export interface SchemaMessageBody extends MessageBody {
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Entity
     */
    entity: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * UUID
     */
    uuid: string;
    /**
     * Version
     */
    version: string;
    /**
     * Code Version
     */
    code_version: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Document CID
     */
    document_cid: string;
    /**
     * Document URL
     */
    document_url?: string;
    /**
     * Document URI
     */
    document_uri?: string;
    /**
     * Context CID
     */
    context_cid: string;
    /**
     * Context URL
     */
    context_url?: string;
    /**
     * Context URI
     */
    context_uri?: string;
}

/**
 * Topic message body
 */
export interface TopicMessageBody extends MessageBody {
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Message owner
     */
    messageType: string;
    /**
     * Child ID
     */
    childId: string;
    /**
     * Parent
     */
    parentId: string;
    /**
     * Rationale
     */
    rationale: string;
}

/**
 * VC message body
 */
export interface VcMessageBody extends MessageBody {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Document status
     */
    documentStatus: string;
    /**
     * Encoded Data
     */
    encodedData: boolean;
    /**
     * Guardian Version
     */
    guardianVersion: string;
    /**
     * Tag
     */
    tag: string;
    /**
     * Start Message
     */
    startMessage: string;
    /**
     * Entity Type
     */
    entityType: string;
    /**
     * Option
     */
    option: any;
    /**
     * Tags
     */
    tags: any[];
}

/**
 * VP message body
 */
export interface VpMessageBody extends MessageBody {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Tag
     */
    tag: string;
    /**
     * Entity Type
     */
    entityType: string;
    /**
     * Option
     */
    option: any;
    /**
     * Tags
     */
    tags: any[];
}

/**
 * Registration message body
 */
export interface RegistrationMessageBody extends MessageBody {
    /**
     * DID
     */
    did: string;
    /**
     * Topic ID
     */
    topicId: string;
    /**
     * Language
     */
    lang: string;
    /**
     * Attributes
     */
    attributes: { [x: string]: string } | undefined;
}

/**
 * Token message body
 */
export interface TokenMessageBody extends MessageBody {
    /**
     * Token id
     */
    tokenId: string;

    /**
     * Token name
     */
    tokenName: string;

    /**
     * Token symbol
     */
    tokenSymbol: string;

    /**
     * Token type
     */
    tokenType: string;

    /**
     * Token decimals
     */
    decimals: string;

    /**
     * Owner
     */
    owner: string;
}

/**
 * Synchronization message body
 */
export interface SynchronizationMessageBody extends MessageBody {
    /**
     * Language
     */
    lang: string;
    /**
     * User DID
     */
    user?: string,
    /**
     * Policy ID (Topic ID)
     */
    policy?: string,
    /**
     * Policy Type
     */
    policyType?: MultiPolicyType,
    /**
     * Message Id
     */
    messageId?: string,
    /**
     * Token Id
     */
    tokenId?: string,
    /**
     * Token amount
     */
    amount?: any;
    /**
     * Target Account
     */
    target?: string;
    /**
     * Memo
     */
    memo?: string;
    /**
     * Policy Owner DID
     */
    policyOwner?: string;
}

/**
 * Module message body
 */
export interface ModuleMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Topic id
     */
    topicId: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * Tag message body
 */
export interface TagMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Target
     */
    target: string;
    /**
     * Operation
     */
    operation: 'Create' | 'Delete';
    /**
     * Entity
     */
    entity: string;
    /**
     * Date
     */
    date: string;
}

/**
 * Role message body
 */
export interface RoleMessageBody extends VcMessageBody {
    /**
     * Role
     */
    role?: string;
    /**
     * Group
     */
    group?: string;
}

/**
 * Role message body
 */
export interface GuardianRoleMessageBody extends VcMessageBody {
    /**
     * UUID
     */
    uuid?: string;
    /**
     * Name
     */
    name?: string;
    /**
     * Description
     */
    description?: string;
}

/**
 * Role message body
 */
export interface UserPermissionsMessageBody extends VcMessageBody {
    /**
     * User DID
     */
    user?: string;
}

/**
 * Tool message body
 */
export interface ToolMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Hash
     */
    hash: string;
    /**
     * Topic id
     */
    topicId: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Tags topic ID
     */
    tagsTopicId: string;
    /**
     * Version
     */
    version: string;
}

/**
 * Contract message body
 */
export interface ContractMessageBody extends MessageBody {
    /**
     * Contract id
     */
    contractId: string;

    /**
     * Contract description
     */
    description: string;

    /**
     * Contract type
     */
    contractType: ContractType;

    /**
     * Owner
     */
    owner: string;

    /**
     * Version
     */
    version: string;
}

/**
 * Policy Statistic message body
 */
export interface StatisticMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Policy topic ID
     */
    policyTopicId: string;
    /**
     * Policy instance topic ID
     */
    policyInstanceTopicId: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * Policy Label message body
 */
export interface LabelMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Policy topic ID
     */
    policyTopicId: string;
    /**
     * Policy instance topic ID
     */
    policyInstanceTopicId: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * Formula message body
 */
export interface FormulaMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Policy topic ID
     */
    policyTopicId: string;
    /**
     * Policy instance topic ID
     */
    policyInstanceTopicId: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * Statistic Assessment message body
 */
export interface StatisticAssessmentMessageBody extends MessageBody {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Target
     */
    target: string;
    /**
     * Definition
     */
    definition: string;
}

/**
 * Label Assessment message body
 */
export interface LabelDocumentMessageBody extends MessageBody {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Target
     */
    target: string;
    /**
     * Definition
     */
    definition: string;
}

/**
 * Policy diff message body
 */
export interface PolicyDiffMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Diff type
     */
    diffType: 'backup' | 'diff' | 'keys';
    /**
     * Diff index
     */
    diffIndex: number;
    /**
     * Topic id
     */
    policyTopicId: string;
    /**
     * Instance topic ID
     */
    instanceTopicId: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * PolicyActionMessageBody
 */
export interface PolicyActionMessageBody extends MessageBody {
    /**
     * UUID
     */
    uuid: string;
    /**
     * User
     */
    owner: string;
    /**
     * Policy
     */
    policyId: string;
    /**
     * User account
     */
    accountId: string;
    /**
     * User account
     */
    relayerAccount: string;
    /**
     * Block
     */
    blockTag: string;
    /**
     * Parent message
     */
    parent: string;
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
}

/**
 * Schema message body
 */
export interface SchemaPackageMessageBody extends MessageBody {
    /**
     * Name
     */
    name: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Version
     */
    version: string;
    /**
     * Schemas counts
     */
    schemas: number;
    /**
     * Document CID
     */
    document_cid: string;
    /**
     * Document URL
     */
    document_url?: string;
    /**
     * Document URI
     */
    document_uri?: string;
    /**
     * Context CID
     */
    context_cid: string;
    /**
     * Context URL
     */
    context_url?: string;
    /**
     * Context URI
     */
    context_uri?: string;
    /**
     * Metadata CID
     */
    metadata_cid: string;
    /**
     * Metadata URL
     */
    metadata_url?: string;
    /**
     * Metadata URI
     */
    metadata_uri?: string;
}

/**
 * Discussion message body
 */
export interface DiscussionMessageBody extends MessageBody {
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Hash
     */
    hash: string;
    /**
     * Target
     */
    target: string;
}

/**
 * Comment message body
 */
export interface CommentMessageBody extends MessageBody {
    /**
     * CID
     */
    cid: string;
    /**
     * URI
     */
    uri: string;
    /**
     * Discussion
     */
    discussion: string;
    /**
     * Hash
     */
    hash: string;
    /**
     * Target
     */
    target: string;
}