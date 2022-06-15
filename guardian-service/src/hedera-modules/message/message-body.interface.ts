import { MessageStatus } from './message';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';

export interface MessageBody {
    id: string;
    status: MessageStatus;
    type: MessageType;
    action: MessageAction;
    revokeMessage?: string;
    reason?: string;
    parentIds?: string[];
}

export interface DidMessageBody extends MessageBody {
    did: string;
    cid: string;
    url: string;
}

export interface PolicyMessageBody extends MessageBody {
    uuid: string;
    name: string;
    description: string;
    topicDescription: string;
    version: string;
    policyTag: string;
    owner: string;
    topicId: string;
    instanceTopicId: string;
    cid: string;
    url: string;
}

export interface SchemaMessageBody extends MessageBody {
    name: string;
    description: string;
    entity: string;
    owner: string;
    uuid: string;
    version: string;
    document_cid: string;
    document_url: string;
    context_cid: string;
    context_url: string;
}

export interface TopicMessageBody extends MessageBody {
    name: string;
    description: string;
    owner: string;
    messageType: string;
    childId: string;
    parentId: string;
    rationale: string;
}

export interface VcMessageBody extends MessageBody {
    issuer: string;
    cid: string;
    url: string;
    relationships: string[];
}

export interface VpMessageBody extends MessageBody {
    issuer: string;
    cid: string;
    url: string;
    relationships: string[];
}