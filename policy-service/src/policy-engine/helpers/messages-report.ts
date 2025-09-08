import {
    DIDMessage,
    HederaDid,
    Message,
    MessageAction,
    MessageServer,
    MessageType,
    SchemaMessage,
    TopicMessage,
    UrlType,
    VCMessage,
    Workers
} from '@guardian/common';
import { TopicType, WorkerTaskType } from '@guardian/interfaces';

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

    constructor() {
        this.topics = new Map<string, any>();
        this.messages = new Map<string, any>();
        this.schemas = new Map<string, any>();
        this.tokens = new Map<string, any>();
        this.users = new Map<string, any>();
    }

    /**
     * Build report
     * @param messageId
     * @param userId
     */
    public async start(messageId: string, userId: string | null) {
        await this.checkMessage(messageId, userId);
        await this.checkUsers(userId);
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
     * @param timestamp
     * @param userId
     */
    private async checkMessage(timestamp: string, userId: string | null) {
        if (this.messages.has(timestamp)) {
            return;
        }
        this.messages.set(timestamp, null);

        const message = await MessageServer
            .getMessage({
                messageId: timestamp,
                loadIPFS: false,
                userId,
                interception: null
            });
        if (!message) {
            return;
        }

        if (this.needDocument(message)) {
            await MessageServer.loadDocument(message);
        }

        this.messages.set(timestamp, message.toJson());
        this.users.set(message.getOwner(), null);

        await this.checkToken(message, userId);
        await this.checkTopic(message.getTopicId(), userId);

        for (const id of message.getRelationships()) {
            await this.checkMessage(id, userId);
        }
    }

    /**
     * Search tokens
     * @param message
     * @param userId
     */
    private async checkToken(message: Message, userId: string | null) {
        if (message.type === MessageType.VCDocument) {
            const document = (message as VCMessage).document;
            if (document &&
                document.credentialSubject &&
                document.credentialSubject[0] &&
                document.credentialSubject[0].type === 'MintToken') {
                const tokenId = document.credentialSubject[0].tokenId;
                if (tokenId && !this.tokens.has(tokenId)) {
                    this.tokens.set(tokenId, null);
                    const info = await this.getToken(tokenId, userId);
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
     * @param topicId
     * @param userId
     */
    private async checkTopic(topicId: string, userId: string | null) {
        if (this.topics.has(topicId)) {
            return;
        }
        this.topics.set(topicId, null);

        const message = await MessageServer.getTopic(topicId, userId);
        if (!message) {
            return;
        }

        this.topics.set(topicId, message.toJson());

        if (message.parentId) {
            await this.checkTopic(message.parentId, userId);
        }
        if (message.rationale) {
            await this.checkMessage(message.rationale, userId);
        }

        await this.checkSchemas(message, userId);
    }

    /**
     * Search schemas
     * @param message
     * @param userId
     */
    private async checkSchemas(message: TopicMessage, userId: string | null) {
        if (message.messageType === TopicType.PolicyTopic) {
            const messages: any[] = await MessageServer.getTopicMessages({
                topicId: message.getTopicId(),
                userId
            });
            const schemas: SchemaMessage[] = messages
                .filter((m: SchemaMessage) => m.action === MessageAction.PublishSchema || m.action === MessageAction.PublishSystemSchema);
            for (const schema of schemas) {
                const id = schema.getContextUrl(UrlType.url);
                if (!this.schemas.has(id)) {
                    await MessageServer.loadDocument(schema);
                    this.schemas.set(id, schema.toJson());
                }
            }
        }
    }

    /**
     * Search users
     * @param userId
     */
    private async checkUsers(userId: string | null) {
        const topics: Set<string> = new Set<string>();
        for (const did of this.users.keys()) {
            try {
                const { topicId } = HederaDid.parse(did);
                topics.add(topicId);
            } catch (error) {
                continue;
            }
        }
        for (const topicId of topics) {
            try {
                const messages: any[] = await MessageServer.getTopicMessages({ topicId, userId });
                const documents: DIDMessage[] = messages.filter((m: DIDMessage) => m.action === MessageAction.CreateDID);
                for (const document of documents) {
                    if (this.users.has(document.did) && !this.users.get(document.did)) {
                        await MessageServer.loadDocument(document);
                        this.messages.set(document.id, document.toJson());
                        this.users.set(document.did, document.toJson());
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }

    /**
     * Get token information
     * @param tokenId
     * @param userId
     */
    public async getToken(tokenId: string, userId: string | null): Promise<any> {
        try {
            const workers = new Workers();
            const info = await workers.addRetryableTask({
                type: WorkerTaskType.GET_TOKEN_INFO,
                data: { tokenId, payload: { userId } }
            }, {
                priority: 10
            });
            return info;
        } catch (error) {
            return null;
        }
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

        messages.sort((a, b) => a.id > b.id ? 1 : -1);
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
