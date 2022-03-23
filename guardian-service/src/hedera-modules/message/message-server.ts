import {
    AccountId,
    PrivateKey,
    TopicId,
} from '@hashgraph/sdk';
import { IPFS } from '@helpers/ipfs';
import { Message } from './message';
import { HederaSDKHelper } from './../hedera-sdk-helper';
import { MessageType } from './message-type';
import { VCMessage } from './vc-message';
import { DIDMessage } from './did-message';
import { Logger } from 'logger-helper';
import { PolicyMessage } from './policy-message';
import { SchemaMessage } from './schema-message';
import { MessageAction } from './message-action';

export class MessageServer {
    private client: HederaSDKHelper;
    private submitKey: PrivateKey | string;

    constructor(operatorId?: string | AccountId, operatorKey?: string | PrivateKey) {
        this.client = new HederaSDKHelper(operatorId, operatorKey);
    }

    public setSubmitKey(submitKey: PrivateKey | string): void {
        this.submitKey = submitKey;
    }

    private async sendIPFS<T extends Message>(message: T): Promise<T> {
        const buffers = await message.toDocuments();
        const urls = [];
        for (let i = 0; i < buffers.length; i++) {
            const buffer = buffers[i];
            const result = await IPFS.addFile(buffer);
            urls.push(result);
        }
        message.setUrls(urls);
        return message;
    }

    private async loadIPFS<T extends Message>(message: T): Promise<T> {
        const urls = message.urls;
        const documents = [];
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const document = await IPFS.getFile(url.cid, message.responseType);
            documents.push(document);
        }
        message = message.loadDocuments(documents) as T;
        return message;
    }

    private async sendHedera<T extends Message>(topicId: string | TopicId, message: T): Promise<T> {
        const buffer = message.toMessage();
        const id = await this.client.submitMessage(topicId, buffer, this.submitKey);
        message.setId(id);
        message.setTopicId(topicId);
        return message;
    }

    public static fromMessage(message: string): Message {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): Message {
        switch (json.type) {
            case MessageType.VCDocument:
                return VCMessage.fromMessageObject(json);
            case MessageType.DIDDocument:
                return DIDMessage.fromMessageObject(json);
            case MessageType.SchemaDocument:
                return SchemaMessage.fromMessageObject(json);
            case MessageType.PolicyDocument:
                return PolicyMessage.fromMessageObject(json);
            default:
                new Logger().error(`Invalid format message: ${json.type}`, ['GUARDIAN_SERVICE']);
                console.error(`Invalid format message: ${json.type}`);
                throw 'Invalid format';
        }
    }


    private async getTopicMessage(timeStamp: string): Promise<Message> {
        const { topicId, message } = await this.client.getTopicMessage(timeStamp);
        new Logger().info(`getTopicMessage, ${timeStamp}, ${topicId}, ${message}`, ['GUARDIAN_SERVICE']);
        const result = MessageServer.fromMessage(message);
        result.setId(timeStamp);
        result.setTopicId(topicId);
        return result;
    }

    public async sendMessage<T extends Message>(topicId: string | TopicId, message: T): Promise<T> {
        message = await this.sendIPFS(message);
        message = await this.sendHedera(topicId, message);
        return message;
    }

    public async getMessage<T extends Message>(id: string): Promise<T> {
        let message = await this.getTopicMessage(id);
        message = await this.loadIPFS(message);
        return message as T;
    }
}
