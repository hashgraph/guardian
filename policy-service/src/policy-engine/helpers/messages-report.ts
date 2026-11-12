import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { Workers } from '@guardian/common/helpers/workers';
import { DIDMessage } from '@guardian/hedera/message/did-message';
import { HederaDid } from '@guardian/hedera/vcjs/did/hedera-did';
import { Message } from '@guardian/hedera/message/message';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { MessageType } from '@guardian/hedera/message/message-type';
import { SchemaMessage } from '@guardian/hedera/message/schema-message';
import { TopicMessage } from '@guardian/hedera/message/topic-message';
import { UrlType } from '@guardian/hedera/message/url.interface';
import { VCMessage } from '@guardian/hedera/message/vc-message';
import { TokenType, TopicType, WorkerTaskType } from '@guardian/interfaces';
import { AnyBlockType } from '../policy-engine.interface.js';

/**
 * Trust Chain interface
 */
export interface IReport {
    /**
     * List of roles
     */
    roles: any[],
    /**
     * List of topics
     */
    topics: any[],
    /**
     * List of schemas
     */
    schemas: any[],
    /**
     * List of users
     */
    users: any[],
    /**
     * List of tokens
     */
    tokens: any[]
}

/**
 * Trust Chain report
 */
export class MessagesReport {
    /**
     * List of topics
     */
    private readonly topics: Map<string, any>;
    /**
     * List of messages
     */
    private readonly messages: Map<string, any>;
    /**
     * List of schemas
     */
    private readonly schemas: Map<string, any>;
    /**
     * List of tokens
     */
    private readonly tokens: Map<string, any>;
    /**
     * List of users
     */
    private readonly users: Map<string, any>;

    private readonly virtualMessages: Set<string>;

    constructor() {
        this.virtualMessages = new Set<string>();
        this.topics = new Map<string, any>();
        this.messages = new Map<string, any>();
        this.schemas = new Map<string, any>();
        this.tokens = new Map<string, any>();
        this.users = new Map<string, any>();
    }

    /**
     * Build report
     * @param ref
     * @param messageId
     * @param userId
     */
    public async start(
        ref: AnyBlockType,
        messageId: string,
        userId: string | null
    ) {
        await this.checkMessage(ref, messageId, userId);
        if (ref.dryRun) {
            await this.checkDryRunSchemas(ref);
        }
        await this.checkUsers(ref, userId);
    }

    /**
     * Need load file
     * @param message
     */
    private needDocument(message: Message): boolean {
        return (
            message.type === MessageType.VCDocument ||
            message.type === MessageType.VPDocument ||
            message.type === MessageType.RoleDocument
        );
    }

    /**
     * Search messages
     * @param ref
     * @param timestamp
     * @param userId
     */
    private async checkMessage(
        ref: AnyBlockType,
        timestamp: string,
        userId: string | null,
        allowHedera = false
    ) {
        if (this.messages.has(timestamp)) {
            return;
        }
        this.messages.set(timestamp, null);

        let virtualMessage = !!ref.dryRun && !ref.mockId;
        let message = await MessageServer
            .tryGetMessage({
                messageId: timestamp,
                loadIPFS: false,
                userId,
                interception: null,
                dryRun: ref.dryRun,
                mockId: ref.mockId
            });

        if (!message && ref.dryRun && ref.mockId) {
            message = await MessageServer.tryGetMessage({
                messageId: timestamp,
                loadIPFS: false,
                userId,
                interception: null,
                dryRun: ref.dryRun,
                mockId: null
            });
            virtualMessage = !!message;
        }

        let fromHedera = false;
        if (!message && ref.dryRun && allowHedera) {
            message = await MessageServer.tryGetMessage({
                messageId: timestamp,
                loadIPFS: false,
                userId,
                interception: null,
                dryRun: null,
                mockId: null
            });
            fromHedera = !!message;
            virtualMessage = false;
        }
        if (!message) {
            return;
        }

        const encrypted = ref.dryRun && (message.type === MessageType.EVCDocument ||
            ('encodedData' in message && message.encodedData));
        if (this.needDocument(message) && !encrypted) {
            try {
                await MessageServer.loadDocument(message, null, {
                    dryRun: fromHedera ? null : ref.dryRun,
                    mockId: fromHedera ? null : ref.mockId,
                });
            } catch (error) {
                if (!ref.dryRun) {
                    throw error;
                }
                const filters = { messageId: timestamp, policyId: ref.policyId };
                const record = message.type === MessageType.VPDocument
                    ? await ref.databaseServer.getVpDocument(filters)
                    : await ref.databaseServer.getVcDocument(filters);
                if (record?.document) {
                    await message.loadDocuments([JSON.stringify(record.document)], null);
                }
            }
        }

        const json = message.toJson();
        if (encrypted) {
            json.document = null;
        }
        if (ref.dryRun && (encrypted || (this.needDocument(message) && !json.document))) {
            json.documentUnavailable = true;
        }
        if (virtualMessage) {
            this.virtualMessages.add(message.id);
        }
        this.messages.set(timestamp, json);
        this.users.set(message.getOwner(), null);

        if (!encrypted) {
            await this.checkToken(ref, message, userId);
        }
        await this.checkTopic(ref, message.getTopicId(), userId);

        for (const id of message.getRelationships()) {
            await this.checkMessage(ref, id, userId, true);
        }
    }

    /**
     * Search tokens
     * @param message
     * @param userId
     */
    private async checkToken(
        ref: AnyBlockType,
        message: Message,
        userId: string | null
    ) {
        if (message.type === MessageType.VCDocument) {
            const document = (message as VCMessage).document;
            if (document &&
                document.credentialSubject &&
                document.credentialSubject[0] &&
                document.credentialSubject[0].type === 'MintToken') {
                const tokenId = document.credentialSubject[0].tokenId;
                if (tokenId && !this.tokens.has(tokenId)) {
                    this.tokens.set(tokenId, null);
                    const info = await this.getToken(ref, tokenId, userId);
                    if (info) {
                        this.tokens.set(tokenId, {
                            name: info.name,
                            symbol: info.symbol,
                            tokenId: info.token_id,
                            type: info.type,
                            memo: info.memo,
                            decimals: info.decimals,
                        });
                    }
                }
            }
        }
    }

    /**
     * Search topics
     * @param ref
     * @param topicId
     * @param userId
     */
    private async checkTopic(
        ref: AnyBlockType,
        topicId: string,
        userId: string | null
    ) {
        if (this.topics.has(topicId)) {
            return;
        }
        this.topics.set(topicId, null);

        let message: TopicMessage;
        if (!ref.dryRun || ref.mockId) {
            try {
                message = await MessageServer.getTopic(topicId, userId, {
                    dryRun: ref.dryRun,
                    mockId: ref.mockId,
                });
            } catch (error) {
                if (!ref.dryRun) {
                    throw error;
                }
            }
        }
        if (!message && ref.dryRun) {
            const messages = await MessageServer.getDryRunMessages<TopicMessage>({
                dryRun: ref.dryRun,
                topicId,
                type: MessageType.Topic,
                action: MessageAction.CreateTopic,
                userId
            });
            message = messages.find((item) => !item.childId);
            if (!message && !ref.mockId) {
                try {
                    message = await MessageServer.getTopic(topicId, userId, {
                        dryRun: ref.dryRun,
                        mockId: ref.mockId,
                    });
                } catch (error) {
                    return;
                }
            }
        }

        if (!message) {
            return;
        }

        this.topics.set(topicId, message.toJson());

        if (message.parentId) {
            await this.checkTopic(ref, message.parentId, userId);
        }
        if (message.rationale) {
            await this.checkMessage(ref, message.rationale, userId, true);
        }

        await this.checkSchemas(ref, message, userId);
    }

    /**
     * Search schemas
     * @param ref
     * @param message
     * @param userId
     */
    private async checkSchemas(
        ref: AnyBlockType,
        message: TopicMessage,
        userId: string | null
    ) {
        if (ref.dryRun && !ref.mockId) {
            return;
        }
        if (message.messageType === TopicType.PolicyTopic) {
            let messages: any[];
            try {
                messages = await MessageServer.getTopicMessages({
                    topicId: message.getTopicId(),
                    userId,
                    dryRun: ref.dryRun,
                    mockId: ref.mockId,
                });
            } catch (error) {
                if (!ref.dryRun) {
                    throw error;
                }
                return;
            }
            const schemas: SchemaMessage[] = messages
                .filter((m: SchemaMessage) => m.action === MessageAction.PublishSchema || m.action === MessageAction.PublishSystemSchema);
            for (const schema of schemas) {
                const id = schema.getContextUrl(UrlType.url);
                if (!this.schemas.has(id)) {
                    try {
                        await MessageServer.loadDocument(schema, null, {
                            dryRun: ref.dryRun,
                            mockId: ref.mockId,
                        });
                        this.schemas.set(id, schema.toJson());
                    } catch (error) {
                        if (!ref.dryRun) {
                            throw error;
                        }
                    }
                }
            }
        }
    }

    private async checkDryRunSchemas(ref: AnyBlockType) {
        const contexts = new Set<string>();
        for (const message of this.messages.values()) {
            if (!message?.document) {
                continue;
            }
            const documents = [message.document, ...(message.document.verifiableCredential || [])];
            for (const document of documents) {
                if (Array.isArray(document?.['@context'])) {
                    for (const context of document['@context']) {
                        if (typeof context === 'string' && !this.schemas.has(context)) {
                            contexts.add(context);
                        }
                    }
                }
            }
        }
        if (!contexts.size) {
            return;
        }
        const topicIds = [
            ref.policyInstance.topicId,
            ...(ref.policyInstance.tools || []).map((tool) => tool.topicId)
        ].filter(Boolean);
        const schemas = await DatabaseServer.getSchemas({
            topicId: { $in: topicIds },
            contextURL: { $in: Array.from(contexts) }
        });
        for (const schema of schemas) {
            if (!schema.contextURL || this.schemas.has(schema.contextURL)) {
                continue;
            }
            const message = new SchemaMessage(MessageAction.PublishSchema);
            message.setDocument(schema);
            message.setId(schema.messageId);
            message.setTopicId(schema.topicId);
            this.schemas.set(schema.contextURL, {
                ...message.toJson(),
                documentUrl: schema.documentURL || null,
                contextUrl: schema.contextURL
            });
        }
    }

    /**
     * Search users
     * @param ref
     * @param userId
     */
    private async checkUsers(ref: AnyBlockType, userId: string | null) {
        const topics: Set<string> = new Set<string>();
        for (const did of this.users.keys()) {
            if (ref.dryRun && !ref.mockId) {
                continue;
            }
            try {
                const { topicId } = HederaDid.parse(did);
                topics.add(topicId);
            } catch (error) {
                continue;
            }
        }
        for (const topicId of topics) {
            try {
                const messages: any[] = await MessageServer.getTopicMessages({
                    topicId,
                    userId,
                    dryRun: ref.dryRun,
                    mockId: ref.mockId,
                });
                const documents: DIDMessage[] = messages.filter((m: DIDMessage) => m.action === MessageAction.CreateDID);
                for (const document of documents) {
                    if (this.users.has(document.did) && !this.users.get(document.did)) {
                        await MessageServer.loadDocument(document, null, {
                            dryRun: ref.dryRun,
                            mockId: ref.mockId,
                        });
                        this.messages.set(document.id, document.toJson());
                        this.users.set(document.did, document.toJson());
                    }
                }
            } catch (error) {
                continue;
            }
        }
        if (ref.dryRun) {
            for (const did of this.users.keys()) {
                if (!did || this.users.get(did)) {
                    continue;
                }
                const record = await ref.databaseServer.getDidDocument(did)
                    || await DatabaseServer.getDidDocument(did);
                if (!record?.document) {
                    continue;
                }
                const message = DIDMessage.fromJson({
                    id: record.messageId || null,
                    type: MessageType.DIDDocument,
                    action: MessageAction.CreateDID,
                    did,
                    topicId: record.topicId || HederaDid.parse(did).topicId,
                    document: record.document
                });
                const json = message.toJson();
                this.users.set(did, json);
                if (record.messageId) {
                    this.messages.set(record.messageId, json);
                }
            }
        }
    }

    /**
     * Get token information
     * @param tokenId
     * @param userId
     */
    public async getToken(
        ref: AnyBlockType,
        tokenId: string,
        userId: string | null
    ): Promise<any> {
        try {
            const workers = new Workers();
            const info = await workers.addRetryableTask({
                type: WorkerTaskType.GET_TOKEN_INFO,
                data: {
                    tokenId,
                    payload: { userId }
                }
            }, {
                priority: 10,
                dryRun: ref.dryRun,
                mockId: ref.mockId,
            });
            if (info || !ref.dryRun) {
                return info;
            }
        } catch (error) {
            if (!ref.dryRun) {
                return null;
            }
        }
        if (ref.dryRun) {
            const token = await ref.databaseServer.getToken(tokenId, ref.dryRun)
                || await DatabaseServer.getToken(tokenId);
            if (token) {
                return {
                    name: token.tokenName,
                    symbol: token.tokenSymbol,
                    token_id: token.tokenId,
                    type: token.tokenType === TokenType.NON_FUNGIBLE ? 'NON_FUNGIBLE_UNIQUE' : 'FUNGIBLE_COMMON',
                    memo: '',
                    decimals: token.decimals
                };
            }
        }
        return null;
    }

    /**
     * Get report
     */
    public toJson(): IReport {
        const topicsMap = new Map<string, any>();
        for (const [topicId, message] of this.topics.entries()) {
            const parent = message?.parentId;
            topicsMap.set(topicId, {
                topicId,
                message,
                parent,
                children: [],
                messages: [],
            });
        }
        const topics: any[] = [];
        const messages: any[] = [];
        const roles: any[] = [];
        const schemas: any[] = [];
        const users: any[] = [];
        const tokens: any[] = [];

        for (const topic of topicsMap.values()) {
            if (topicsMap.has(topic.parent)) {
                topicsMap.get(topic.parent).children.push(topic);
            } else {
                topics.push(topic);
            }
        }

        for (const message of this.messages.values()) {
            if (message && topicsMap.has(message.topicId)) {
                messages.push(message);
                if (message.type === MessageType.RoleDocument) {
                    roles.push(message);
                }
                topicsMap.get(message.topicId).messages.push(message);
            }
        }

        const timestamps = new Map<string, bigint>();
        if (this.virtualMessages.size) {
            for (const message of messages) {
                const parts = /^(\d+)\.(\d{1,9})$/.exec(message.id);
                if (!parts) {
                    timestamps.clear();
                    break;
                }
                const timestamp = BigInt(parts[1]) * 1_000_000_000n + BigInt(parts[2].padEnd(9, '0'));
                timestamps.set(message.id, this.virtualMessages.has(message.id)
                    ? timestamp * 1_000_000n
                    : timestamp);
            }
        }
        if (timestamps.size && timestamps.size === messages.length) {
            messages.sort((a, b) => {
                const left = timestamps.get(a.id);
                const right = timestamps.get(b.id);
                return left < right ? -1 : left > right ? 1 : 0;
            });
        } else {
            messages.sort((a, b) => a.id > b.id ? 1 : -1);
        }
        for (let index = 0; index < messages.length; index++) {
            messages[index].order = index;
        }

        for (const schema of this.schemas.values()) {
            schemas.push(schema);
        }

        for (const document of this.users.values()) {
            if (document) {
                users.push(document);
            }
        }

        for (const token of this.tokens.values()) {
            tokens.push(token);
        }

        const result: IReport = {
            roles,
            topics,
            schemas,
            users,
            tokens
        };
        return result;
    }
}
