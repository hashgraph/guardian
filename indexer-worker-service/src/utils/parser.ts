import { MessageCache, Message } from '@indexer/common';
import { MessageAction, MessageType } from '@indexer/interfaces';

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
            message.owner = row.owner;
            message.sequenceNumber = row.sequenceNumber;

            message.uuid = json.id;
            message.status = json.status || 'ISSUE';
            message.statusReason = json.reason;
            message.type = json.type;
            message.action = json.action;
            message.lang = json.lang || 'en-US';
            message.responseType = json.responseType || 'str';

            if (message.status === 'REVOKE') {
                message.statusMessage = json.revokeMessage;
                message.statusOwner = json.revokeOwner;
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
                case MessageType.EVC_DOCUMENT:
                case MessageType.VC_DOCUMENT:
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    message.options.documentStatus = json.documentStatus;
                    message.options.encodedData = json.encodedData || json.type === 'EVC-Document';
                    message.options.tag = json.tag;
                    message.options.startMessage = json.startMessage;
                    message.options.entityType = json.entityType;
                    message.options.option = json.option;
                    message.options.initId = json.initId;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.DID_DOCUMENT:
                    message.options.did = json.did;
                    message.options.relationships = json.relationships;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.SCHEMA:
                case MessageType.SCHEMA_DOCUMENT:
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
                case MessageType.SCHEMA_PACKAGE:
                    message.options.name = json.name;
                    message.options.owner = json.owner;
                    message.options.version = json.version;
                    message.options.schemas = json.schemas;
                    if (json.document_cid) {
                        message.files.push(json.document_cid);
                        message.files.push(json.context_cid);
                        message.files.push(json.metadata_cid);
                    }
                    break;
                case MessageType.POLICY:
                case MessageType.INSTANCE_POLICY:
                    message.options.uuid = json.uuid;
                    message.options.originalHash = json.originalHash;
                    message.options.currentHash = json.currentHash;
                    message.options.originalMessageId = json.originalMessageId;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.topicDescription = json.topicDescription;
                    message.options.version = json.version;
                    message.options.policyTag = json.policyTag;
                    message.options.owner = json.owner;
                    message.options.policyTopicId = json.topicId;
                    message.options.instanceTopicId = json.instanceTopicId;
                    message.options.synchronizationTopicId = json.synchronizationTopicId;
                    message.options.commentsTopicId = json.commentsTopicId;
                    if (json.effectiveDate) {
                        message.options.discontinuedDate = new Date(json.effectiveDate)
                    }
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    message.topics = [
                        json.topicId,
                        json.instanceTopicId,
                        json.synchronizationTopicId,
                        json.commentsTopicId
                    ];
                    break;
                case MessageType.VP_DOCUMENT:
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    //Label
                    if (json.action === MessageAction.CreateLabelDocument) {
                        message.options.target = json.target;
                        message.options.definition = json.definition;
                    }
                    //Statistic
                    if (json.action === MessageAction.CreateStatisticAssessment) {
                        message.options.target = json.target;
                        message.options.definition = json.definition;
                    }
                    break;
                case MessageType.STANDARD_REGISTRY:
                    message.options.did = json.did;
                    message.options.registrantTopicId = json.topicId;
                    message.options.lang = json.lang;
                    message.options.attributes = json.attributes || {};
                    message.topics = [json.topicId];
                    break;
                case MessageType.TOPIC:
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.messageType = json.messageType;
                    message.options.childId = json.childId;
                    message.options.parentId = json.parentId;
                    message.options.rationale = json.rationale;
                    message.topics = [json.childId];
                    break;
                case MessageType.TOKEN:
                    message.options.tokenId = json.tokenId;
                    message.options.tokenName = json.tokenName;
                    message.options.tokenSymbol = json.tokenSymbol;
                    message.options.tokenType = json.tokenType;
                    message.options.decimals = json.decimals;
                    message.options.owner = json.owner;
                    message.tokens = [json.tokenId];
                    break;
                case MessageType.MODULE:
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
                case MessageType.TOOL:
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
                case MessageType.TAG:
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
                case MessageType.SYNCHRONIZATION_EVENT:
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
                case MessageType.CONTRACT:
                    message.options.contractId = json.contractId;
                    message.options.description = json.description;
                    message.options.contractType = json.contractType;
                    message.options.owner = json.owner;
                    break;
                case MessageType.ROLE_DOCUMENT:
                    message.options.issuer = json.issuer;
                    message.options.role = json.role;
                    message.options.group = json.group;
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    message.options.documentStatus = json.documentStatus;
                    message.options.encodedData = false;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.GUARDIAN_ROLE:
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    message.options.documentStatus = json.documentStatus;
                    message.options.encodedData = false;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.USER_PERMISSIONS:
                    message.options.user = json.user;
                    message.options.issuer = json.issuer;
                    message.options.relationships = json.relationships;
                    message.options.documentStatus = json.documentStatus;
                    message.options.encodedData = false;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.POLICY_STATISTIC:
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.policyTopicId = json.policyTopicId;
                    message.options.policyInstanceTopicId = json.policyInstanceTopicId;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.POLICY_LABEL:
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.policyTopicId = json.policyTopicId;
                    message.options.policyInstanceTopicId = json.policyInstanceTopicId;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.FORMULA:
                    message.options.uuid = json.uuid;
                    message.options.name = json.name;
                    message.options.description = json.description;
                    message.options.owner = json.owner;
                    message.options.policyTopicId = json.policyTopicId;
                    message.options.policyInstanceTopicId = json.policyInstanceTopicId;
                    message.options.autoGenerated = json.autoGenerated;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.POLICY_COMMENT:
                    message.options.hash = json.hash;
                    message.options.target = json.target;
                    message.options.discussion = json.discussion;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
                    break;
                case MessageType.POLICY_DISCUSSION:
                    message.options.hash = json.hash;
                    message.options.target = json.target;
                    message.options.relationships = json.relationships;
                    if (json.cid) {
                        message.files.push(json.cid);
                    }
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
