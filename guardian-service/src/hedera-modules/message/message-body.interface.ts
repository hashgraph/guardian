import { MessageStatus } from './message';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';

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
     * URL
     */
    url: string;
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
     * CID
     */
    cid: string;
    /**
     * URL
     */
    url: string;
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
     * Document CID
     */
    document_cid: string;
    /**
     * Document URL
     */
    document_url: string;
    /**
     * Context CID
     */
    context_cid: string;
    /**
     * Context URL
     */
    context_url: string;
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
     * URL
     */
    url: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Document status
     */
    documentStatus: string;
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
     * URL
     */
    url: string;
    /**
     * Relationships
     */
    relationships: string[];
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