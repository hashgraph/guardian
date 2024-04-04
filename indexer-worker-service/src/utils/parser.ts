import { MessageCache, Message } from '@indexer/common';

export class Parser {
    public static parseMassage(row: MessageCache): Message | null {
        try {
            if (!row || !row.data) {
                return null;
            }
            const json = JSON.parse(row.data);
            if (typeof json !== 'object') {
                return null;
            }

            const message = new Message();

            message.topicId = row.topicId;
            message.consensusTimestamp = row.consensusTimestamp;

            message.uuid = json.id;
            message.status = json.status || 'ISSUE';
            message.statusReason = json.reason;
            message.type = json.type;
            message.action = json.action;
            message.lang = json.lang || 'en-US';
            message.responseType = json.responseType || 'str';

            if (message.status === 'REVOKE') {
                message.statusMessage = json.revokeMessage;
            } else if (message.status === 'DELETED') {
                message.statusMessage = json.deleteMessage;
            } else {
                message.statusMessage = json.statusMessage;
            }

            message.options = {};
            message.files = [];
            message.documents = [];
            message.topics = [];
            message.tokens = [];

            switch (json.type) {
                case 'EVC-Document':
                case 'VC-Document':
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    message.options.documentStatus = json.documentStatus;
                    message.options.encodedData = json.encodedData || json.type === 'EVC-Document';
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case 'DID-Document':
                    message.options.did = json.did;
                    message.options.relationships = json.relationships;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case 'Schema':
                case 'schema-document':
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.entity = json.entity;
                    message.options.owner = json.owner;
                    message.options.uuid = json.uuid;
                    message.options.version = json.version;
                    message.options.codeVersion = json.code_version;
                    message.options.relationships = json.relationships;
                    if (json.document_cid) {
                        message.files.push(json.document_cid);
                        message.files.push(json.context_cid);
                    }
                    break;
                case 'Policy':
                case 'Instance-Policy':
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.topicDescription = json.topicDescription;
                    message.options.version = json.version;
                    message.options.policyTag = json.policyTag;
                    message.options.owner = json.owner;
                    message.options.policyTopicId = json.topicId;
                    message.options.instanceTopicId = json.instanceTopicId;
                    message.options.synchronizationTopicId = json.synchronizationTopicId;
                    if (json.effectiveDate) {
                        message.options.discontinuedDate = new Date(json.effectiveDate)
                    }
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    message.topics = [
                        json.topicId,
                        json.instanceTopicId,
                        json.synchronizationTopicId
                    ];
                    break;
                case 'VP-Document':
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case 'Standard Registry':
                    message.options.did = json.did;
                    message.options.registrantTopicId = json.topicId;
                    message.options.lang = json.lang;
                    message.options.attributes = json.attributes || {};
                    message.topics = [json.topicId];
                    break;
                case 'Topic':
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.messageType = json.messageType;
                    message.options.childId = json.childId;
                    message.options.parentId = json.parentId;
                    message.options.rationale = json.rationale;
                    break;
                case 'Token':
                    message.options.tokenId = json.tokenId;
                    message.options.tokenName = json.tokenName;
                    message.options.tokenSymbol = json.tokenSymbol;
                    message.options.tokenType = json.tokenType;
                    message.options.decimals = json.decimals;
                    message.options.owner = json.owner;
                    message.tokens = [json.tokenId];
                    break;
                case 'Module':
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.moduleTopicId = json.topicId;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    message.topics = [json.topicId];
                    break;
                case 'Tool':
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.hash = json.hash;
                    message.options.toolTopicId = json.topicId;
                    message.options.tagsTopicId = json.tagsTopicId;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    message.topics = [json.topicId, json.tagsTopicId];
                    break;
                case 'Tag':
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.target = json.target;
                    message.options.operation = json.operation;
                    message.options.entity = json.entity;
                    message.options.date = json.date;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case 'Role-Document':
                    message.options.role = json.role;
                    message.options.group = json.group;
                    break;
                case 'Synchronization Event':
                    message.options.user = json.user;
                    message.options.policy = json.policy;
                    message.options.policyType = json.policyType;
                    message.options.messageId = json.messageId;
                    message.options.tokenId = json.tokenId;
                    message.options.amount = json.amount;
                    message.options.memo = json.memo;
                    message.options.target = json.target;
                    message.options.policyOwner = json.policyOwner;
                    break;
                case 'Contract':
                    message.options.contractId = json.contractId;
                    message.options.description = json.description;
                    message.options.contractType = json.contractType;
                    message.options.owner = json.owner;
                    break;
                default:
                    return null;
            }
            return message;
        } catch (error) {
            return null;
        }
    }
}