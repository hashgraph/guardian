import { AccountId, PrivateKey, TopicId, } from '@hashgraph/sdk';
import { GenerateUUIDv4, ISignOptions, SignType, WorkerTaskType } from '@guardian/interfaces';
import { IPFS, PinoLogger, Workers } from '../../helpers/index.js';
import { TransactionLogger } from '../transaction-logger.js';
import { Environment } from '../environment.js';
import { MessageMemo } from '../memo-mappings/message-memo.js';
import { DatabaseServer } from '../../database-modules/index.js';
import { TopicConfig } from '../topic.js';
import { Message } from './message.js';
import { MessageType } from './message-type.js';
import { MessageAction } from './message-action.js';
import { VCMessage } from './vc-message.js';
import { DIDMessage } from './did-message.js';
import { PolicyMessage } from './policy-message.js';
import { SchemaMessage } from './schema-message.js';
import { VPMessage } from './vp-message.js';
import { RegistrationMessage } from './registration-message.js';
import { TopicMessage } from './topic-message.js';
import { TokenMessage } from './token-message.js';
import { ModuleMessage } from './module-message.js';
import { TagMessage } from './tag-message.js';
import { ToolMessage } from './tool-message.js';
import { RoleMessage } from './role-message.js';
import { GuardianRoleMessage } from './guardian-role-message.js';
import { UserPermissionsMessage } from './user-permissions-message.js';
import { StatisticMessage } from './statistic-message.js';
import { LabelMessage } from './label-message.js';
import { FormulaMessage } from './formula-message.js';
import { PolicyDiffMessage } from './policy-diff-message.js';
import { PolicyActionMessage } from './policy-action-message.js';
import { ContractMessage } from './contract-message.js';

/**
 * Message server
 */
export class MessageServer {
    /**
     * Key
     * @private
     */
    private submitKey: PrivateKey | string;
    /**
     * Topic ID
     * @private
     */
    private topicId: TopicId | string;
    /**
     * Lang
     * @private
     */
    private static lang: string;

    /**
     * Dry-run
     * @private
     */
    private readonly dryRun: string = null;

    /**
     * Client options
     * @private
     */
    private readonly clientOptions: any;

    /**
     * Sign options
     * @private
     */
    private readonly signOptions: ISignOptions;

    constructor(
        operatorId: string | AccountId | null,
        operatorKey: string | PrivateKey | null,
        signOptions: ISignOptions = { signType: SignType.INTERNAL },
        dryRun: string = null
    ) {
        this.clientOptions = { operatorId, operatorKey, dryRun };
        this.signOptions = signOptions;

        this.dryRun = dryRun || null;
    }

    /**
     * Send message
     * @param message
     * @param sendToIPFS
     * @param memo
     * @param userId
     */
    public async sendMessage<T extends Message>(message: T, sendToIPFS: boolean = true, memo?: string, userId?: string): Promise<T> {
        if (sendToIPFS) {
            message = await this.sendIPFS(message, userId);
        }
        message = await this.sendHedera(message, memo, userId);
        if (this.dryRun) {
            await DatabaseServer.saveVirtualMessage<T>(this.dryRun, message);
        }
        return message;
    }

    /**
     * Get File
     * @param cid
     * @param responseType
     * @virtual
     * @private
     */
    private async getFile(cid: string, responseType: 'json' | 'raw' | 'str') {
        if (this.dryRun) {
            throw new Error('Unable to get virtual file');
        }
        return await IPFS.getFile(cid, responseType);
    }

    /**
     * Set language
     * @param lang
     */
    public static setLang(lang: string) {
        MessageServer.lang = lang;
    }

    /**
     * Message starting
     * @param name
     * @param userId
     */
    public async messageStartLog(name: string, userId: string | null): Promise<string> {
        const id = GenerateUUIDv4();
        await new TransactionLogger().messageLog(id, name, userId);
        return id;
    }

    /**
     * Message end log
     * @param id
     * @param name
     * @param userId
     */
    public async messageEndLog(id: string, name: string, userId: string | null): Promise<void> {
        await new TransactionLogger().messageLog(id, name, userId);
    }

    /**
     * Set topic object
     * @param topic
     */
    public setTopicObject(topic: TopicConfig): MessageServer {
        this.submitKey = topic.submitKey;
        this.topicId = topic.topicId;
        return this;
    }

    /**
     * Set topic
     * @param topicId
     * @param submitKey
     */
    public setTopic(topicId: TopicId | string, submitKey?: PrivateKey | string): MessageServer {
        this.submitKey = submitKey;
        this.topicId = topicId;
        return this;
    }

    /**
     * Get topic
     */
    public getTopic(): string {
        if (this.topicId) {
            return this.topicId.toString();
        }
        return undefined;
    }

    /**
     * Save File
     * @param file
     * @param userId
     * @virtual
     * @private
     */
    private async addFile(file: ArrayBuffer, userId: string = null) {
        if (this.dryRun) {
            const id = GenerateUUIDv4();
            const result = {
                cid: id,
                url: id
            }
            await new TransactionLogger().virtualFileLog(this.dryRun, file, result);
            return result
        }
        return IPFS.addFile(file, userId);
    }

    /**
     * Load IPFS
     * @param message
     * @private
     */
    public async loadIPFS<T extends Message>(message: T): Promise<T> {
        const urls = message.getUrls();
        const promises = urls.map(url => {
            return this.getFile(url.cid, message.responseType);
        });
        const documents = await Promise.all(promises);
        message = (await message.loadDocuments(
            documents,
            this.clientOptions.operatorKey
        )) as T;
        return message;
    }

    /**
     * Load IPFS
     * @param message
     * @private
     */
    public static async loadIPFS<T extends Message>(message: T): Promise<T> {
        const urls = message.getUrls();
        const promises = urls
            .map(url => {
                return IPFS.getFile(url.cid, message.responseType);
            });
        const documents = await Promise.all(promises);
        message = await message.loadDocuments(documents) as T;
        return message;
    }

    /**
     * Send IPFS
     * @param message
     * @param userId
     * @private
     */
    private async sendIPFS<T extends Message>(message: T, userId: string = null): Promise<T> {
        const buffers = await message.toDocuments(
            this.clientOptions.operatorKey
        );
        if (buffers && buffers.length) {
            const time = await this.messageStartLog('IPFS', userId);
            const promises = buffers.map(buffer => {
                return this.addFile(buffer, userId);
            });
            const urls = await Promise.all(promises);
            await this.messageEndLog(time, 'IPFS', userId);
            message.setUrls(urls);
        } else {
            message.setUrls([]);
        }
        return message;
    }

    /**
     * From message
     * @param message
     * @param userId
     * @param type
     */
    public static fromMessage<T extends Message>(message: string, userId: string | null, type?: MessageType): T {
        const json = JSON.parse(message);
        return MessageServer.fromMessageObject(json, userId, type);
    }

    /**
     * From message object
     * @param json
     * @param userId
     * @param type
     */
    public static fromMessageObject<T extends Message>(json: any, userId: string | null, type?: MessageType): T {
        let message: Message;
        json.type = json.type || type;
        switch (json.type) {
            case MessageType.EVCDocument:
            case MessageType.VCDocument:
                message = VCMessage.fromMessageObject(json);
                break;
            case MessageType.DIDDocument:
                message = DIDMessage.fromMessageObject(json);
                break;
            case MessageType.Schema:
                message = SchemaMessage.fromMessageObject(json);
                break;
            case MessageType.Policy:
                message = PolicyMessage.fromMessageObject(json);
                break;
            case MessageType.InstancePolicy:
                message = PolicyMessage.fromMessageObject(json);
                break;
            case MessageType.VPDocument:
                message = VPMessage.fromMessageObject(json);
                break;
            case MessageType.StandardRegistry:
                message = RegistrationMessage.fromMessageObject(json);
                break;
            case MessageType.Topic:
                message = TopicMessage.fromMessageObject(json);
                break;
            case MessageType.Token:
                message = TokenMessage.fromMessageObject(json);
                break;
            case MessageType.Module:
                message = ModuleMessage.fromMessageObject(json);
                break;
            case MessageType.Tool:
                message = ToolMessage.fromMessageObject(json);
                break;
            case MessageType.Tag:
                message = TagMessage.fromMessageObject(json);
                break;
            case MessageType.RoleDocument:
                message = RoleMessage.fromMessageObject(json);
                break;
            case MessageType.GuardianRole:
                message = GuardianRoleMessage.fromMessageObject(json);
                break;
            case MessageType.UserPermissions:
                message = UserPermissionsMessage.fromMessageObject(json);
                break;
            case MessageType.PolicyStatistic:
                message = StatisticMessage.fromMessageObject(json);
                break;
            case MessageType.PolicyLabel:
                message = LabelMessage.fromMessageObject(json);
                break;
            case MessageType.Formula:
                message = FormulaMessage.fromMessageObject(json);
                break;
            case MessageType.PolicyDiff:
                message = PolicyDiffMessage.fromMessageObject(json);
                break;
            case MessageType.PolicyAction:
                message = PolicyActionMessage.fromMessageObject(json);
                break;
            // Default schemas
            case 'schema-document':
                message = SchemaMessage.fromMessageObject(json);
                break;
            default:
                new PinoLogger().error(`Invalid format message: ${json.type}`, ['GUARDIAN_SERVICE'], userId);
                throw new Error(`Invalid format message: ${json.type || 'UNKNOWN TYPE'}`);
        }
        if (!message.validate()) {
            new PinoLogger().error(`Invalid json: ${json.type || 'UNKNOWN TYPE'}`, ['GUARDIAN_SERVICE'], userId);
            throw new Error(`Invalid json: ${json.type}`);
        }
        return message as T;
    }

    /**
     * From message object
     * @param json
     * @param type
     */
    public static fromJson<T extends Message>(json: any): T {
        let message: Message;
        json.type = json.type;
        switch (json.type) {
            case MessageType.Contract:
                message = ContractMessage.fromJson(json);
                break;
            case MessageType.EVCDocument:
            case MessageType.VCDocument:
                message = VCMessage.fromJson(json);
                break;
            case MessageType.DIDDocument:
                message = DIDMessage.fromJson(json);
                break;
            case MessageType.Schema:
                message = SchemaMessage.fromJson(json);
                break;
            case MessageType.Policy:
            case MessageType.InstancePolicy:
                message = PolicyMessage.fromJson(json);
                break;
            case MessageType.VPDocument:
                message = VPMessage.fromJson(json);
                break;
            case MessageType.StandardRegistry:
                message = RegistrationMessage.fromJson(json);
                break;
            case MessageType.Topic:
                message = TopicMessage.fromJson(json);
                break;
            case MessageType.Token:
                message = TokenMessage.fromJson(json);
                break;
            case MessageType.Module:
                message = ModuleMessage.fromJson(json);
                break;
            case MessageType.Tool:
                message = ToolMessage.fromJson(json);
                break;
            case MessageType.Tag:
                message = TagMessage.fromJson(json);
                break;
            case MessageType.RoleDocument:
                message = RoleMessage.fromJson(json);
                break;
            case MessageType.GuardianRole:
                message = GuardianRoleMessage.fromJson(json);
                break;
            case MessageType.UserPermissions:
                message = UserPermissionsMessage.fromJson(json);
                break;
            case MessageType.PolicyStatistic:
                message = StatisticMessage.fromJson(json);
                break;
            case MessageType.PolicyLabel:
                message = LabelMessage.fromJson(json);
                break;
            case MessageType.Formula:
                message = FormulaMessage.fromJson(json);
                break;
            case MessageType.PolicyDiff:
                message = PolicyDiffMessage.fromJson(json);
                break;
            case MessageType.PolicyAction:
                message = PolicyActionMessage.fromJson(json);
                break;
            // Default schemas
            case 'schema-document':
                message = SchemaMessage.fromJson(json);
                break;
            default:
                throw new Error(`Invalid format message: ${json.type || 'UNKNOWN TYPE'}`);
        }
        if (!message.validate()) {
            throw new Error(`Invalid json: ${json.type}`);
        }
        return message as T;
    }

    /**
     * Get messages
     * @param messageId
     * @param userId
     */
    public static async getMessage<T extends Message>(messageId: string, userId: string | null): Promise<T> {
        try {
            if (!messageId || typeof messageId !== 'string') {
                return null;
            }
            const timeStamp = messageId.trim();
            const workers = new Workers();
            const message = await workers.addNonRetryableTask({
                type: WorkerTaskType.GET_TOPIC_MESSAGE,
                data: { timeStamp, payload: { userId } }
            }, 10);
            const item = MessageServer.fromMessage(message.message, userId);
            item.setAccount(message.payer_account_id);
            item.setIndex(message.sequence_number);
            item.setId(message.id);
            item.setTopicId(message.topicId);
            item.setMemo(message.memo);
            return item as T;
        } catch (error) {
            return null;
        }
    }

    /**
     * Send to hedera
     * @param message
     * @param memo
     * @param userId
     * @private
     */
    private async sendHedera<T extends Message>(message: T, memo?: string, userId: string = null): Promise<T> {
        if (!this.topicId) {
            throw new Error('Topic is not set');
        }

        message.setLang(MessageServer.lang);
        if (memo) {
            message.setMemo(memo);
        } else {
            message.setMemo(MessageMemo.getMessageMemo(message));
        }
        const time = await this.messageStartLog('Hedera', userId);
        const buffer = message.toMessage();
        const timestamp = await new Workers().addRetryableTask({
            type: WorkerTaskType.SEND_HEDERA,
            data: {
                topicId: this.topicId,
                buffer,
                submitKey: this.submitKey,
                clientOptions: this.clientOptions,
                network: Environment.network,
                localNodeAddress: Environment.localNodeAddress,
                localNodeProtocol: Environment.localNodeProtocol,
                signOptions: this.signOptions,
                memo: message.getMemo(),
                dryRun: this.dryRun,
                payload: { userId },
            }
        }, 10, 0, userId);
        await this.messageEndLog(time, 'Hedera', userId);
        message.setId(timestamp);
        message.setTopicId(this.topicId);
        return message;
    }

    /**
     * Get messages
     * @param topicId
     * @param userId
     */
    public static async getTopic(topicId: string | TopicId, userId: string | null): Promise<TopicMessage> {
        if (!topicId) {
            throw new Error(`Invalid Topic Id`);
        }
        const topic = topicId.toString();
        const workers = new Workers();
        const message = await workers.addNonRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGE_BY_INDEX,
            data: {
                topic,
                index: 1,
                payload: { userId }
            }
        }, 10);
        new PinoLogger().info(`getTopic, ${topic}`, ['GUARDIAN_SERVICE'], userId);
        try {
            const json = JSON.parse(message.message);
            if (json.type === MessageType.Topic) {
                const item = TopicMessage.fromMessageObject(json);
                item.setAccount(message.payer_account_id);
                item.setIndex(message.sequence_number);
                item.setId(message.id);
                item.setMemo(message.memo);
                item.setTopicId(topic);
                return item;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Load document
     * @param message
     */
    public async loadDocument<T extends Message>(message: T): Promise<T> {
        return await this.loadIPFS<T>(message);
    }

    /**
     * Load documents
     * @param message
     */
    public async loadDocuments<T extends Message>(messages: T[]): Promise<T[]> {
        for (const message of messages) {
            const urls = message.getUrls();
            const documents: any[] = [];
            for (const url of urls) {
                const doc = await this.getFile(url.cid, message.responseType);
                documents.push(doc);
            }
            await message.loadDocuments(documents, this.clientOptions.operatorKey);
        }
        return messages;
    }

    /**
     * Load document
     * @param message
     */
    public static async loadDocument<T extends Message>(message: T, cryptoKey?: string): Promise<T> {
        const urls = message.getUrls();
        const documents: any[] = [];
        for (const url of urls) {
            const doc = await IPFS.getFile(url.cid, message.responseType);
            documents.push(doc);
        }
        await message.loadDocuments(documents, cryptoKey);
        return message;
    }

    /**
     * Load documents
     * @param message
     */
    public static async loadDocuments<T extends Message>(messages: T[], cryptoKey?: string): Promise<T[]> {
        for (const message of messages) {
            const urls = message.getUrls();
            const documents: any[] = [];
            for (const url of urls) {
                const doc = await IPFS.getFile(url.cid, message.responseType);
                documents.push(doc);
            }
            await message.loadDocuments(documents, cryptoKey);
        }
        return messages;
    }

    /**
     * Get message
     * @param id
     * @param type
     * @param userId
     */
    public async getMessage<T extends Message>(id: string, type?: MessageType, userId?: string): Promise<T> {
        if (this.dryRun) {
            const message = await DatabaseServer.getVirtualMessage(this.dryRun, id);
            const result = MessageServer.fromMessage<T>(message.document, userId, type);
            result.setId(message.messageId);
            result.setTopicId(message.topicId);
            result.setMemo(message.memo);
            return result;
        } else {
            let message = await this.getTopicMessage<T>(id, type, userId);
            message = await this.loadIPFS(message);
            return message as T;
        }
    }

    /**
     * Find topic
     * @param messageId
     * @param userId
     */
    public async findTopic(messageId: string, userId: string | null): Promise<string> {
        try {
            if (messageId && typeof messageId === 'string') {
                const timeStamp = messageId.trim();
                const { operatorId, operatorKey, dryRun } = this.clientOptions;
                const workers = new Workers();
                const { topicId } = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_TOPIC_MESSAGE,
                    data: {
                        operatorId,
                        operatorKey,
                        dryRun,
                        timeStamp,
                        payload: { userId }
                    }
                }, 10);
                return topicId;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get topic message
     * @param timeStamp
     * @param type
     * @param userId
     * @private
     */
    private async getTopicMessage<T extends Message>(timeStamp: string, type?: MessageType, userId?: string): Promise<T> {
        if (timeStamp && typeof timeStamp === 'string') {
            timeStamp = timeStamp.trim();
        }

        const { operatorId, operatorKey, dryRun } = this.clientOptions;
        const workers = new Workers();
        const { topicId, message } = await workers.addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGE,
            data: {
                operatorId,
                operatorKey,
                dryRun,
                timeStamp,
                payload: { userId }
            }
        }, 10, null, userId);

        new PinoLogger().info(`getTopicMessage, ${timeStamp}, ${topicId}, ${message}`, ['GUARDIAN_SERVICE'], userId);
        const result = MessageServer.fromMessage<T>(message, userId, type);
        result.setAccount(message.payer_account_id);
        result.setIndex(message.sequence_number);
        result.setId(timeStamp);
        result.setTopicId(topicId);
        result.setMemo(message.memo);
        return result;
    }

    /**
     * Get messages
     * @param topicId
     * @param userId
     * @param type
     * @param action
     */
    public static async getMessages<T extends Message>(
        dryRun: string,
        topicId: string | TopicId,
        userId: string | null,
        type?: MessageType,
        action?: MessageAction
    ): Promise<T[]> {
        if (dryRun) {
            return await MessageServer.getDryRunMessages(dryRun, topicId, userId, type, action) as T[];
        } else {
            return await MessageServer.getTopicMessages(topicId, userId, type, action) as T[];
        }
    }

    /**
     * Get topic message
     * @param dryRun
     * @param topicId
     * @param userId
     * @param type
     * @param action
     * @param timeStamp
     */
    public static async getDryRunMessages<T extends Message>(
        dryRun: string,
        topicId: string | TopicId,
        userId: string | null,
        type?: MessageType,
        action?: MessageAction,
        timeStamp?: string
    ) {
        const messages = await DatabaseServer.getVirtualMessages(dryRun, topicId);
        const result: T[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage<T>(message.document, userId);
                let filter = true;
                if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setId(message.messageId);
                    item.setTopicId(message.topicId);
                    item.setMemo(message.memo);
                    result.push(item);
                }
            } catch (error) {
                console.error(error.message);
            }
        }
        return result;
    }

    /**
     * Get topic message
     * @param topicId
     * @param userId
     * @param type
     * @param action
     * @param timeStamp
     */
    public static async getTopicMessages<T extends Message>(
        topicId: string | TopicId,
        userId: string | null,
        type?: MessageType,
        action?: MessageAction,
        timeStamp?: string
    ): Promise<T[]> {
        if (!topicId) {
            throw new Error(`Invalid Topic Id`);
        }

        if (timeStamp && typeof timeStamp === 'string') {
            timeStamp = timeStamp.trim();
        }

        const topic = topicId.toString();
        const workers = new Workers();
        const messages = await workers.addNonRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGES,
            data: {
                topic,
                timeStamp,
                payload: { userId }
            }
        }, 10);
        new PinoLogger().info(`getTopicMessages, ${topic}`, ['GUARDIAN_SERVICE'], userId);
        const result: Message[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage(message.message, userId);
                let filter = true;
                if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setAccount(message.payer_account_id);
                    item.setIndex(message.sequence_number);
                    item.setId(message.id);
                    item.setTopicId(topic);
                    item.setMemo(message.memo);
                    result.push(item);
                }
            } catch (error) {
                console.error(error.message);
            }
        }
        return result as T[];
    }

    /**
     * Get messages
     * @param topicId
     * @param userId
     * @param type
     * @param action
     */
    public async getMessages<T extends Message>(
        topicId: string | TopicId,
        userId: string | null,
        type?: MessageType,
        action?: MessageAction
    ): Promise<T[]> {
        if (this.dryRun) {
            return await this.getDryRunMessages(this.dryRun, topicId, userId, type, action) as T[];
        } else {
            return await this.getTopicMessages(topicId, userId, type, action) as T[];
        }
    }

    /**
     * Get topic message
     * @param dryRun
     * @param topicId
     * @param userId
     * @param type
     * @param action
     * @param timeStamp
     * @private
     */
    public async getDryRunMessages<T extends Message>(
        dryRun: string,
        topicId: string | TopicId,
        userId: string | null,
        type?: MessageType,
        action?: MessageAction,
        timeStamp?: string
    ): Promise<Message[]> {
        const messages = await DatabaseServer.getVirtualMessages(dryRun, topicId);
        const result: T[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage<T>(message.document, userId);
                let filter = true;
                if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setId(message.messageId);
                    item.setTopicId(message.topicId);
                    item.setMemo(message.memo);
                    result.push(item);
                }
            } catch (error) {
                console.error(error.message);
            }
        }
        return result;
    }

    /**
     * Get topic messages
     * @param topicId
     * @param userId
     * @param type
     * @param action
     * @param timeStamp
     */
    public async getTopicMessages(
        topicId: string | TopicId,
        userId: string | null,
        type?: MessageType,
        action?: MessageAction,
        timeStamp?: string
    ): Promise<Message[]> {
        const { operatorId, dryRun } = this.clientOptions;

        if (!topicId) {
            throw new Error(`Invalid Topic Id`);
        }

        if (timeStamp && typeof timeStamp === 'string') {
            timeStamp = timeStamp.trim();
        }

        const topic = topicId.toString();
        const workers = new Workers();
        const messages = await workers.addNonRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGES,
            data: {
                dryRun,
                topic,
                timeStamp,
                payload: { userId }
            }
        }, 10);

        new PinoLogger().info(`getTopicMessages, ${topic}`, ['GUARDIAN_SERVICE', operatorId], userId);
        const result: Message[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage(message.message, userId);
                let filter = true;
                if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setAccount(message.payer_account_id);
                    item.setIndex(message.sequence_number);
                    item.setId(message.id);
                    item.setTopicId(topic);
                    item.setMemo(message.memo);
                    result.push(item);
                }
            } catch (error) {
                console.error(error.message);
            }
        }
        return result;
    }
}
