import {
    AccountId,
    PrivateKey,
    TopicId,
} from '@hashgraph/sdk';
import { IPFS } from '@helpers/ipfs';
import { Message } from './message';
import { HederaSDKHelper } from '../hedera-sdk-helper';
import { MessageType } from './message-type';
import { VCMessage } from './vc-message';
import { DIDMessage } from './did-message';
import { Logger } from '@guardian/common';
import { PolicyMessage } from './policy-message';
import { SchemaMessage } from './schema-message';
import { MessageAction } from './message-action';
import { VPMessage } from './vp-message';
import { TransactionLogger } from '../transaction-logger';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Message server
 */
export class MessageServer {

    /**
     * Client
     * @private
     */
    private readonly client: HederaSDKHelper;

    /**
     * Submit key
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

    constructor(operatorId?: string | AccountId, operatorKey?: string | PrivateKey) {
        this.client = new HederaSDKHelper(operatorId, operatorKey);
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
        await TransactionLogger.messageLog(id, name);
        return id;
    }

    /**
     * Message end log
     * @param id
     * @param name
     */
    public async messageEndLog(id: string, name: string): Promise<void> {
        await TransactionLogger.messageLog(id, name);
    }

    /**
     * Set topic object
     * @param topic
     */
    public setTopicObject(topic: {
        /**
         * Topic ID
         */
        topicId: string,
        /**
         * Key
         */
        key: string
    }): MessageServer {
        this.submitKey = topic.key;
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
        const time = await this.messageStartLog('IPFS');
        const buffers = await message.toDocuments();
        const urls = [];
        for (const buffer of buffers) {
            const result = await IPFS.addFile(buffer);
            urls.push(result);
        }
        await this.messageEndLog(time, 'IPFS');
        message.setUrls(urls);
        return message;
    }

    /**
     * Async send IPFS
     * @param message
     * @private
     */
    private async sendIPFSAsync<T extends Message>(message: T): Promise<T> {
        const time = await this.messageStartLog('IPFS');
        const buffers = await message.toDocuments();

        /*const urls = [];
        for (const buffer of buffers) {
            const result = await IPFS.addFileAsync(buffer);
            urls.push(result);
        }
        */

        const promises = buffers.map(buffer => {
            return IPFS.addFileAsync(buffer);
        });
        const urls = await Promise.all(promises);
        await this.messageEndLog(time, 'IPFS');

        message.setUrls(urls);
        return message;
    }

    /**
     * Load IPFS
     * @param message
     * @private
     */
    private async loadIPFS<T extends Message>(message: T): Promise<T> {
        const urls = message.getUrls();
        const documents = [];
        for (const url of urls) {
            const document = await IPFS.getFile(url.cid, message.responseType);
            documents.push(document);
        }
        message = message.loadDocuments(documents) as T;
        return message;
    }

    /**
     * Send to hedera
     * @param message
     * @private
     */
    private async sendHedera<T extends Message>(message: T): Promise<T> {
        if (!this.topicId) {
            throw new Error('Topic not set');
        }
        message.setLang(MessageServer.lang);
        const time = await this.messageStartLog('Hedera');
        const buffer = message.toMessage();
        const id = await this.client.submitMessage(this.topicId, buffer, this.submitKey);
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
        const { topicId, message } = await this.client.getTopicMessage(timeStamp);
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
        const topic = topicId.toString();
        const messages = await this.client.getTopicMessages(topic);
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
    public async sendMessage<T extends Message>(message: T, sendToIPFS: boolean = true): Promise<T> {
        if (sendToIPFS) {
            message = await this.sendIPFS(message);
        }
        message = await this.sendHedera(message);
        return message;
    }

    /**
     * Async send message
     * @param message
     * @param sendToIPFS
     */
    public async sendMessageAsync<T extends Message>(message: T, sendToIPFS: boolean = true): Promise<T> {
        if (sendToIPFS) {
            message = await this.sendIPFSAsync(message);
        }
        message = await this.sendHedera(message);
        return message;
    }

    /**
     * Get message
     * @param id
     * @param type
     */
    public async getMessage<T extends Message>(id: string, type?: MessageType): Promise<T> {
        let message = await this.getTopicMessage<T>(id, type);
        message = await this.loadIPFS(message);
        return message as T;
    }

    /**
     * Get messages
     * @param topicId
     * @param type
     * @param action
     */
    public async getMessages<T extends Message>(topicId: string | TopicId, type?: MessageType, action?: MessageAction): Promise<T[]> {
        const messages = await this.getTopicMessages(topicId, type, action);
        return messages as T[];
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
                const { topicId } = await this.client.getTopicMessage(messageId);
                return topicId;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}
