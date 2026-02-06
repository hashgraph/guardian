import { AccountId, PrivateKey, TopicId, } from '@hiero-ledger/sdk';
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
import { INotificationStep, NewNotifier } from '../../notification/index.js';
import { SchemaPackageMessage } from './schema-package-message.js';
import { CommentMessage } from './comment-message.js';
import { DiscussionMessage } from './discussion-message.js';
import { PolicyRecordMessage } from './policy-record-message.js';

interface LoadMessageOptions {
    messageId: string,
    loadIPFS?: boolean,
    type?: MessageType | MessageType[] | null,
    userId?: string | null,
    dryRun?: string,
    encryptKey?: string,
    interception: string | boolean | null
}

interface LoadMessagesOptions {
    topicId: string | TopicId,
    dryRun?: string,
    userId?: string | null,
    type?: MessageType | MessageType[] | null,
    action?: MessageAction,
    timeStamp?: string
}

interface MessageServerOptions {
    operatorId?: string | AccountId | null,
    operatorKey?: string | PrivateKey | null,
    encryptKey?: string | PrivateKey | null,
    signOptions?: ISignOptions,
    dryRun?: string | null
}

interface MessageOptions {
    sendToIPFS?: boolean,
    memo?: string,
    userId?: string | null,
    interception?: string | boolean | null,
    notifier?: INotificationStep
}

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
     * Operator Id
     * @private
     */
    private readonly operatorId: string | null;

    /**
     * Operator Id
     * @private
     */
    private readonly operatorKey: string | null;

    /**
     * Operator Id
     * @private
     */
    private readonly encryptKey: string | null;

    /**
     * Client options
     * @private
     */
    private readonly clientOptions: {
        operatorId: string | null,
        operatorKey: string | null,
        dryRun: string | null
    };

    /**
     * Sign options
     * @private
     */
    private readonly signOptions: ISignOptions;

    constructor(options: MessageServerOptions) {
        if (options) {
            this.operatorId = options.operatorId ? options.operatorId.toString() : null;
            this.operatorKey = options.operatorKey ? options.operatorKey.toString() : null;
            this.encryptKey = options.encryptKey ? options.encryptKey.toString() : this.operatorKey;
            this.dryRun = options.dryRun || null;
            this.signOptions = options.signOptions || { signType: SignType.INTERNAL };
        } else {
            this.operatorId = null;
            this.operatorKey = null;
            this.encryptKey = null;
            this.dryRun = null;
            this.signOptions = { signType: SignType.INTERNAL };
        }
        this.clientOptions = {
            operatorId: this.operatorId,
            operatorKey: this.operatorKey,
            dryRun: this.dryRun
        };
    }

    /**
     * Send message
     * @param message
     * @param sendToIPFS
     * @param memo
     * @param userId
     */
    public async sendMessage<T extends Message>(
        message: T,
        options: MessageOptions
    ): Promise<T> {
        // <-- Steps
        const STEP_SEND_FILES = 'Send files';
        const STEP_SEND_MESSAGES = 'Send messages';
        // Steps -->

        const notifier = options?.notifier || NewNotifier.empty();
        if (options.sendToIPFS !== false) {
            notifier.addStep(STEP_SEND_FILES);
        }
        notifier.addStep(STEP_SEND_MESSAGES);
        notifier.start();

        if (options.sendToIPFS !== false) {
            notifier.startStep(STEP_SEND_FILES);
            message = await this.sendIPFS(message, {
                ...options,
                notifier: notifier.getStep(STEP_SEND_FILES)
            });
            notifier.completeStep(STEP_SEND_FILES);
        }

        notifier.startStep(STEP_SEND_MESSAGES);
        message = await this.sendHedera(message, options);
        notifier.completeStep(STEP_SEND_MESSAGES);

        if (this.dryRun) {
            await DatabaseServer.saveVirtualMessage<T>(this.dryRun, message);
        }

        notifier.complete();
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
     * @param options
     * @private
     */
    private async addFile(file: Buffer, options?: MessageOptions) {
        const notifier = options?.notifier || NewNotifier.empty();
        if (this.dryRun) {
            const id = GenerateUUIDv4();
            const result = {
                cid: id,
                url: id
            }
            await new TransactionLogger().virtualFileLog(this.dryRun, file, result);
            return result
        } else {
            // <-- Steps
            const STEP_SEND_FILE = 'Send file';
            // Steps -->

            const step = notifier.addStep(STEP_SEND_FILE);
            step.start();
            const result = await IPFS.addFile(file, options);
            step.complete();
            return result;
        }
    }

    /**
     * Load IPFS
     * @param message
     * @private
     */
    public async loadIPFS<T extends Message>(message: T): Promise<T> {
        const urls = message.getUrls();
        const promises = urls
            .map(url => {
                return this.getFile(url.cid, message.responseType);
            });
        const documents = await Promise.all(promises);
        message = (await message.loadDocuments(documents, this.encryptKey)) as T;
        return message;
    }

    /**
     * Load IPFS
     * @param message
     * @private
     */
    public static async loadIPFS<T extends Message>(
        message: T,
        key?: string
    ): Promise<T> {
        const urls = message.getUrls();
        const promises = urls
            .map(url => {
                return IPFS.getFile(url.cid, message.responseType);
            });
        const documents = await Promise.all(promises);
        message = await message.loadDocuments(documents, key) as T;
        return message;
    }

    /**
     * Send IPFS
     * @param message
     * @param options
     * @private
     */
    private async sendIPFS<T extends Message>(
        message: T,
        options?: MessageOptions
    ): Promise<T> {
        const buffers = await message.toDocuments(this.encryptKey);
        if (buffers && buffers.length) {
            if (options?.notifier) {
                options.notifier.setEstimate(buffers.length);
            }
            const time = await this.messageStartLog('IPFS', options.userId);
            const promises = buffers.map(buffer => {
                return this.addFile(buffer, options);
            });
            const urls = await Promise.all(promises);
            await this.messageEndLog(time, 'IPFS', options.userId);
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
    public static fromMessage<T extends Message>(
        message: string,
        userId: string | null,
        type?: MessageType | MessageType[] | null
    ): T {
        const json = JSON.parse(message);
        return MessageServer.fromMessageObject(json, userId, type);
    }

    /**
     * From message object
     * @param json
     * @param userId
     * @param type
     */
    public static fromMessageObject<T extends Message>(
        json: any,
        userId: string | null,
        type?: MessageType | MessageType[] | null
    ): T {
        let message: Message;
        if (Array.isArray(type)) {
            if (!type.includes(json.type)) {
                new PinoLogger().error(`Invalid message type: ${json.type || 'UNKNOWN TYPE'}`, ['GUARDIAN_SERVICE'], userId);
                throw new Error(`Invalid message type: ${json.type}`);
            }
        } else if (type) {
            if (type !== json.type) {
                new PinoLogger().error(`Invalid message type: ${json.type || 'UNKNOWN TYPE'}`, ['GUARDIAN_SERVICE'], userId);
                throw new Error(`Invalid message type: ${json.type}`);
            }
        }
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
            case MessageType.SchemaPackage:
                message = SchemaPackageMessage.fromMessageObject(json);
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
            case MessageType.PolicyComment:
                message = CommentMessage.fromMessageObject(json);
                break;
            case MessageType.PolicyDiscussion:
                message = DiscussionMessage.fromMessageObject(json);
                break;
            case MessageType.PolicyRecordStep:
                message = PolicyRecordMessage.fromMessageObject(json);
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
            case MessageType.SchemaPackage:
                message = SchemaPackageMessage.fromJson(json);
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
            case MessageType.PolicyComment:
                message = CommentMessage.fromJson(json);
                break;
            case MessageType.PolicyDiscussion:
                message = DiscussionMessage.fromJson(json);
                break;
            case MessageType.PolicyRecordStep:
                message = PolicyRecordMessage.fromJson(json);
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
     * Send to hedera
     * @param message
     * @param memo
     * @param userId
     * @private
     */
    private async sendHedera<T extends Message>(
        message: T,
        options: MessageOptions
        // memo?: string,
        // userId: string = null
    ): Promise<T> {
        if (!this.topicId) {
            throw new Error('Topic is not set');
        }

        message.setLang(MessageServer.lang);
        if (options.memo) {
            message.setMemo(options.memo);
        } else {
            message.setMemo(MessageMemo.getMessageMemo(message));
        }
        const time = await this.messageStartLog('Hedera', options.userId);
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
                payload: { userId: options.userId },
            }
        }, {
            priority: 10,
            attempts: 0,
            userId: options.userId,
            interception: options.interception,
            registerCallback: true
        });

        await this.messageEndLog(time, 'Hedera', options.userId);
        message.setId(timestamp);
        message.setTopicId(this.topicId);
        return message;
    }

    /**
     * Get messages
     * @param topicId
     * @param userId
     */
    public static async getTopic(
        topicId: string | TopicId,
        userId: string | null
    ): Promise<TopicMessage> {
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
        }, {
            priority: 10
        });
        new PinoLogger().info(`getTopic, ${topic}`, ['GUARDIAN_SERVICE'], userId);
        try {
            const json = JSON.parse(message.message);
            if (json.type === MessageType.Topic) {
                const item = TopicMessage.fromMessageObject(json);
                item.setPayer(message.payer_account_id);
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
            await message.loadDocuments(documents, this.encryptKey);
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
     * Find topic
     * @param messageId
     * @param userId
     */
    public async findTopic(messageId: string, userId: string | null): Promise<string> {
        try {
            if (messageId && typeof messageId === 'string') {
                const timeStamp = messageId.trim();
                const workers = new Workers();
                const { topicId } = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_TOPIC_MESSAGE,
                    data: {
                        operatorId: this.operatorId,
                        operatorKey: this.operatorKey,
                        dryRun: this.dryRun,
                        timeStamp,
                        payload: { userId }
                    }
                }, {
                    priority: 10
                });
                return topicId;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get messages
     * @param messageId
     * @param userId
     */
    public static async getMessage<T extends Message>(options: LoadMessageOptions): Promise<T> {
        try {
            if (!options) {
                return null;
            }
            const { loadIPFS, type, userId, dryRun } = options;
            let { messageId } = options;
            if (messageId && typeof messageId === 'string') {
                messageId = messageId.trim();
            }
            if (!messageId || typeof messageId !== 'string') {
                return null;
            }
            if (dryRun) {
                return await MessageServer.getDryRunTopicMessage<T>(dryRun, messageId, type, userId);
            } else {
                let message = await MessageServer.getTopicMessage<T>(messageId, type, options);
                if (loadIPFS) {
                    message = await MessageServer.loadIPFS(message, options.encryptKey);
                }
                return message;
            }
        } catch (error) {
            return null;
        }
    }

    /**
     * Get message
     * @param messageId
     * @param type
     * @param userId
     */
    public async getMessage<T extends Message>(options: LoadMessageOptions): Promise<T> {
        try {
            if (!options) {
                return null;
            }
            const { loadIPFS, type, userId } = options;
            let { messageId } = options;
            if (messageId && typeof messageId === 'string') {
                messageId = messageId.trim();
            }
            if (!messageId || typeof messageId !== 'string') {
                return null;
            }
            if (this.dryRun) {
                return await this.getDryRunTopicMessage<T>(messageId, type, userId);
            } else {
                let message = await this.getTopicMessage<T>(messageId, type, options);
                if (loadIPFS) {
                    message = await this.loadIPFS(message);
                }
                return message as T;
            }
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
    private async getTopicMessage<T extends Message>(
        timeStamp: string,
        type: MessageType | MessageType[] | null,
        options: LoadMessageOptions
    ): Promise<T> {
        const workers = new Workers();
        const {
            id,
            payer_account_id,
            sequence_number,
            topicId,
            message
        } = await workers.addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGE,
            data: {
                timeStamp,
                operatorId: this.operatorId,
                operatorKey: this.operatorKey,
                dryRun: this.dryRun,
                payload: {
                    userId: options.userId
                }
            }
        }, {
            priority: 10,
            attempts: 0,
            userId: options.userId,
            interception: options.interception,
            registerCallback: true
        });

        const item = MessageServer.fromMessage<T>(message, options.userId, type);
        item.setPayer(payer_account_id);
        item.setIndex(sequence_number);
        item.setId(id);
        item.setTopicId(topicId);
        item.setMemo(null);
        return item as T;
    }

    /**
     * Get topic message
     * @param timeStamp
     * @param type
     * @param userId
     * @private
     */
    private static async getTopicMessage<T extends Message>(
        timeStamp: string,
        type: MessageType | MessageType[] | null,
        options: LoadMessageOptions
    ): Promise<T> {
        const workers = new Workers();
        const {
            id,
            payer_account_id,
            sequence_number,
            topicId,
            message
        } = await workers.addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGE,
            data: {
                timeStamp,
                payload: { userId: options.userId }
            }
        }, {
            priority: 10,
            attempts: 0,
            userId: options.userId,
            interception: options.interception,
            registerCallback: true
        });

        const item = MessageServer.fromMessage<T>(message, options.userId, type);
        item.setPayer(payer_account_id);
        item.setIndex(sequence_number);
        item.setId(id);
        item.setTopicId(topicId);
        item.setMemo(null);
        return item as T;
    }

    /**
     * Get topic message
     * @param timeStamp
     * @param type
     * @param userId
     * @private
     */
    private async getDryRunTopicMessage<T extends Message>(
        timeStamp: string,
        type: MessageType | MessageType[] | null,
        userId: string | null
    ): Promise<T> {
        const message = await DatabaseServer.getVirtualMessage(this.dryRun, timeStamp);
        const item = MessageServer.fromMessage<T>(message.document, userId, type);
        item.setPayer(null);
        item.setIndex(null);
        item.setId(message.messageId);
        item.setTopicId(message.topicId);
        item.setMemo(message.memo);
        return item;
    }

    /**
     * Get topic message
     * @param timeStamp
     * @param type
     * @param userId
     * @private
     */
    private static async getDryRunTopicMessage<T extends Message>(
        dryRun: string,
        timeStamp: string,
        type: MessageType | MessageType[] | null,
        userId: string | null
    ): Promise<T> {
        const message = await DatabaseServer.getVirtualMessage(dryRun, timeStamp);
        const item = MessageServer.fromMessage<T>(message.document, userId, type);
        item.setPayer(null);
        item.setIndex(null);
        item.setId(message.messageId);
        item.setTopicId(message.topicId);
        item.setMemo(message.memo);
        return item;
    }

    /**
     * Get messages
     * @param topicId
     * @param userId
     * @param type
     * @param action
     */
    public static async getMessages<T extends Message>(options: LoadMessagesOptions): Promise<T[]> {
        if (options.dryRun) {
            return await MessageServer.getDryRunMessages(options) as T[];
        } else {
            return await MessageServer.getTopicMessages(options) as T[];
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
    public static async getDryRunMessages<T extends Message>(options: LoadMessagesOptions) {
        const { dryRun, topicId, userId, type, action } = options;

        const messages = await DatabaseServer.getVirtualMessages(dryRun, topicId);
        const result: T[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage<T>(message.document, userId);
                let filter = true;
                if (Array.isArray(type)) {
                    filter = filter && type.includes(item.type);
                } else if (type) {
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
    public static async getTopicMessages<T extends Message>(options: LoadMessagesOptions): Promise<T[]> {
        const { topicId, userId, type, action } = options;
        let { timeStamp } = options;
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
        }, {
            priority: 10
        });
        new PinoLogger().info(`getTopicMessages, ${topic}`, ['GUARDIAN_SERVICE'], userId);
        const result: Message[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage(message.message, userId);
                let filter = true;
                if (Array.isArray(type)) {
                    filter = filter && type.includes(item.type);
                } else if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setPayer(message.payer_account_id);
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
        type?: MessageType | MessageType[],
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
        type?: MessageType | MessageType[],
        action?: MessageAction,
        timeStamp?: string
    ): Promise<Message[]> {
        const messages = await DatabaseServer.getVirtualMessages(dryRun, topicId);
        const result: T[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage<T>(message.document, userId);
                let filter = true;
                if (Array.isArray(type)) {
                    filter = filter && type.includes(item.type);
                } else if (type) {
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
        type?: MessageType | MessageType[],
        action?: MessageAction,
        timeStamp?: string
    ): Promise<Message[]> {
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
                dryRun: this.dryRun,
                topic,
                timeStamp,
                payload: { userId }
            }
        }, {
            priority: 10
        });

        new PinoLogger().info(`getTopicMessages, ${topic}`, ['GUARDIAN_SERVICE'], userId);
        const result: Message[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage(message.message, userId);
                let filter = true;
                if (Array.isArray(type)) {
                    filter = filter && type.includes(item.type);
                } else if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setPayer(message.payer_account_id);
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
