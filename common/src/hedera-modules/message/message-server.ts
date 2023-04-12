import {
    AccountId,
    PrivateKey,
    TopicId,
} from '@hashgraph/sdk';
import { Message } from './message';
import { MessageType } from './message-type';
import { VCMessage } from './vc-message';
import { DIDMessage } from './did-message';
import { IPFS, Logger, Workers } from '../../helpers';
import { PolicyMessage } from './policy-message';
import { SchemaMessage } from './schema-message';
import { MessageAction } from './message-action';
import { VPMessage } from './vp-message';
import { TransactionLogger } from '../transaction-logger';
import { GenerateUUIDv4, WorkerTaskType } from '@guardian/interfaces';
import { Environment } from '../environment';
import { MessageMemo } from '../memo-mappings/message-memo';
import { RegistrationMessage } from './registration-message';
import { TopicMessage } from './topic-message';
import { TopicConfig } from '../../hedera-modules';
import { TokenMessage } from './token-message';
import { ModuleMessage } from './module-message';
import { DatabaseServer } from '../../database-modules';
import { TagMessage } from './tag-message';

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

    constructor(
        operatorId: string | AccountId | null,
        operatorKey: string | PrivateKey | null,
        dryRun: string = null
    ) {

        this.clientOptions = { operatorId, operatorKey, dryRun };

        this.dryRun = dryRun || null;
    }

    /**
     * Save File
     * @param file
     * @virtual
     * @private
     */
    private async addFile(file: ArrayBuffer) {
        if (this.dryRun) {
            const id = GenerateUUIDv4();
            const result = {
                cid: id,
                url: id
            }
            await new TransactionLogger().virtualFileLog(this.dryRun, file, result);
            return result
        }
        return IPFS.addFile(file);
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
     */
    public async messageStartLog(name: string): Promise<string> {
        const id = GenerateUUIDv4();
        await new TransactionLogger().messageLog(id, name);
        return id;
    }

    /**
     * Message end log
     * @param id
     * @param name
     */
    public async messageEndLog(id: string, name: string): Promise<void> {
        await new TransactionLogger().messageLog(id, name);
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
     * Send IPFS
     * @param message
     * @private
     */
    private async sendIPFS<T extends Message>(message: T): Promise<T> {
        const buffers = await message.toDocuments(
            this.clientOptions.operatorKey
        );
        if (buffers && buffers.length) {
            const time = await this.messageStartLog('IPFS');
            const promises = buffers.map(buffer => {
                return this.addFile(buffer);
            });
            const urls = await Promise.all(promises);
            await this.messageEndLog(time, 'IPFS');
            message.setUrls(urls);
        } else {
            message.setUrls([]);
        }
        return message;
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
     * Send to hedera
     * @param message
     * @private
     */
    private async sendHedera<T extends Message>(message: T, memo?: string): Promise<T> {
        if (!this.topicId) {
            throw new Error('Topic is not set');
        }
        message.setLang(MessageServer.lang);
        const time = await this.messageStartLog('Hedera');
        const buffer = message.toMessage();
        const id = await new Workers().addRetryableTask({
            type: WorkerTaskType.SEND_HEDERA,
            data: {
                topicId: this.topicId,
                buffer,
                submitKey: this.submitKey,
                clientOptions: this.clientOptions,
                network: Environment.network,
                localNodeAddress: Environment.localNodeAddress,
                localNodeProtocol: Environment.localNodeProtocol,
                memo: memo || MessageMemo.getMessageMemo(message)
            }
        }, 10);
        await this.messageEndLog(time, 'Hedera');
        message.setId(id);
        message.setTopicId(this.topicId);
        return message;
    }

    /**
     * From message
     * @param message
     * @param type
     */
    public static fromMessage<T extends Message>(message: string, type?: MessageType): T {
        const json = JSON.parse(message);
        return MessageServer.fromMessageObject(json, type);
    }

    /**
     * From message object
     * @param json
     * @param type
     */
    public static fromMessageObject<T extends Message>(json: any, type?: MessageType): T {
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
            case MessageType.Tag:
                message = TagMessage.fromMessageObject(json);
                break;
            // Default schemas
            case 'schema-document':
                message = SchemaMessage.fromMessageObject(json);
                break;
            default:
                new Logger().error(`Invalid format message: ${json.type}`, ['GUARDIAN_SERVICE']);
                throw new Error(`Invalid format message: ${json.type || 'UNKNOWN TYPE'}`);
        }
        if (!message.validate()) {
            new Logger().error(`Invalid json: ${json.type || 'UNKNOWN TYPE'}`, ['GUARDIAN_SERVICE']);
            throw new Error(`Invalid json: ${json.type}`);
        }
        return message as T;
    }

    /**
     * Get topic message
     * @param timeStamp
     * @param type
     * @private
     */
    private async getTopicMessage<T extends Message>(timeStamp: string, type?: MessageType): Promise<T> {
        const { operatorId, operatorKey, dryRun } = this.clientOptions;

        const workers = new Workers();
        const { topicId, message } = await workers.addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGE,
            data: {
                operatorId,
                operatorKey,
                dryRun,
                timeStamp
            }
        }, 10);

        new Logger().info(`getTopicMessage, ${timeStamp}, ${topicId}, ${message}`, ['GUARDIAN_SERVICE']);
        const result = MessageServer.fromMessage<T>(message, type);
        result.setId(timeStamp);
        result.setTopicId(topicId);
        return result;
    }

    /**
     * Get topic messages
     * @param topicId
     * @param type
     * @param action
     * @private
     */
    private async getTopicMessages(topicId: string | TopicId, type?: MessageType, action?: MessageAction): Promise<Message[]> {
        const { operatorId, operatorKey, dryRun } = this.clientOptions;

        if(!topicId) {
            throw new Error(`Invalid Topic Id`);
        }

        const topic = topicId.toString();
        const workers = new Workers();
        const messages = await workers.addRetryableTask({
            type: WorkerTaskType.GET_TOPIC_MESSAGES,
            data: {
                operatorId,
                operatorKey,
                dryRun,
                topic
            }
        }, 10);

        new Logger().info(`getTopicMessages, ${topic}`, ['GUARDIAN_SERVICE']);
        const result: Message[] = [];
        for (const message of messages) {
            try {
                const item = MessageServer.fromMessage(message.message);
                let filter = true;
                if (type) {
                    filter = filter && item.type === type;
                }
                if (action) {
                    filter = filter && item.action === action;
                }
                if (filter) {
                    item.setId(message.id);
                    item.setTopicId(topic);
                    result.push(item);
                }
            } catch (error) {
                continue;
            }
        }
        return result;
    }

    /**
     * Send message
     * @param message
     * @param sendToIPFS
     */
    public async sendMessage<T extends Message>(message: T, sendToIPFS: boolean = true, memo?: string): Promise<T> {
        if (sendToIPFS) {
            message = await this.sendIPFS(message);
        }
        message = await this.sendHedera(message, memo);
        if (this.dryRun) {
            await DatabaseServer.saveVirtualMessage<T>(this.dryRun, message);
        }
        return message;
    }

    /**
     * Get message
     * @param id
     * @param type
     */
    public async getMessage<T extends Message>(id: string, type?: MessageType): Promise<T> {
        if (this.dryRun) {
            const message = await DatabaseServer.getVirtualMessage(this.dryRun, id);
            const result = MessageServer.fromMessage<T>(message.document, type);
            result.setId(message.messageId);
            result.setTopicId(message.topicId);
            return result;
        } else {
            let message = await this.getTopicMessage<T>(id, type);
            message = await this.loadIPFS(message);
            return message as T;
        }
    }

    /**
     * Get messages
     * @param topicId
     * @param type
     * @param action
     */
    public async getMessages<T extends Message>(topicId: string | TopicId, type?: MessageType, action?: MessageAction): Promise<T[]> {
        if (this.dryRun) {
            const messages = await DatabaseServer.getVirtualMessages(this.dryRun, topicId);
            const result: T[] = [];
            for (const message of messages) {
                try {
                    const item = MessageServer.fromMessage<T>(message.document);
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
                        result.push(item);
                    }
                } catch (error) {
                    continue;
                }
            }
            return result;
        } else {
            const messages = await this.getTopicMessages(topicId, type, action);
            return messages as T[];
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
     * Find topic
     * @param messageId
     */
    public async findTopic(messageId: string): Promise<string> {
        try {
            if (messageId) {
                const { operatorId, operatorKey, dryRun } = this.clientOptions;

                const workers = new Workers();
                const { topicId } = await workers.addRetryableTask({
                    type: WorkerTaskType.GET_TOPIC_MESSAGE,
                    data: {
                        operatorId,
                        operatorKey,
                        dryRun,
                        timeStamp: messageId
                    }
                }, 10);
                return topicId;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}
