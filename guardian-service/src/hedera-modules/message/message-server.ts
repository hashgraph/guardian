import {
    AccountId,
    PrivateKey,
    TopicId,
} from '@hashgraph/sdk';
import { IPFS } from '@helpers/ipfs';
import { Message } from './message';
import { HederaSDKHelper } from 'hedera-modules/hedera-sdk-helper';

export class MessageServer {
    private client: HederaSDKHelper;
    private submitKey: PrivateKey | string;

    constructor(operatorId: string | AccountId, operatorKey: string | PrivateKey) {
        this.client = new HederaSDKHelper(operatorId, operatorKey);
    }

    public setSubmitKey(submitKey: PrivateKey | string): void {
        this.submitKey = submitKey;
    }

    private async sendIPFS(message: Message): Promise<Message> {
        const buffers = message.toDocuments();
        const urls = [];
        for (let i = 0; i < buffers.length; i++) {
            const buffer = buffers[i];
            const documentFile = new Blob([buffer], { type: "application/json" });
            const result = await IPFS.addFile(await documentFile.arrayBuffer());
            urls.push(result);
        }
        message.setUrls(urls);
        return message;
    }

    private async loadIPFS(message: Message): Promise<Message> {
        const urls = message.urls;
        const documents = [];
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const document = await IPFS.getFile(url.cid, "str") as string;
            documents.push(document);
        }
        message = message.loadDocuments(documents);
        return message;
    }

    private async sendHedera(topicId: string | TopicId, message: Message): Promise<Message> {
        const buffer = message.toMessage();
        const id = await this.client.submitMessage(topicId, buffer, this.submitKey);
        message.setId(id);
        message.setTopicId(topicId);
        return message;
    }

    private async getTopicMessage(timeStamp: string): Promise<any> {
        const { topicId, message } = await this.client.getTopicMessage(timeStamp)
        const result = Message.fromMessage(message);
        result.setId(timeStamp);
        result.setTopicId(topicId);
        return result;
    }

    public async sendMessage(topicId: string | TopicId, message: Message): Promise<Message> {
        message = await this.sendIPFS(message);
        message = await this.sendHedera(topicId, message);
        return message;
    }

    public async getMessage(id: string): Promise<Message> {
        let message = await this.getTopicMessage(id);
        message = await this.loadIPFS(message);
        return message;
    }
}
