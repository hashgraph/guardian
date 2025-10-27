import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { DiscussionMessageBody } from './message-body.interface.js';
import {
    bytesToUtf8,
    CipherStrategy,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
    utf8ToBytes,
} from '@meeco/cryppo';
import { SerializationFormat } from '@meeco/cryppo/dist/src/serialization-versions.js';
import { IPFS } from '../../helpers/index.js';
import { PolicyDiscussion } from '../../entity/index.js';

/**
 * Discussion message
 */
export class DiscussionMessage extends Message {
    /**
     * Parent message id
     */
    public target: string;

    /**
     * Parent message id
     */
    public hash: string;

    /**
     * Relationships
     */
    public relationships: string[];

    /**
     * Document
     */
    public document: any;

    constructor(action: MessageAction) {
        super(action, MessageType.PolicyDiscussion);
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: PolicyDiscussion): void {
        this.hash = document.hash;
        this.target = document.target || '';
        this.relationships = document.relationships || [];
        this.document = document.document;
    }

    /**
     * Get documents
     */
    public getDocument(): any {
        return this.document;
    }

    /**
     * To message object
     */
    public override toMessageObject(): DiscussionMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            hash: this.hash,
            target: this.target,
            relationships: this.relationships,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(key: string): Promise<Buffer[]> {
        let document = JSON.stringify(this.document);
        if (!key) {
            throw new Error(
                'There is no appropriate private key to encode VC data'
            );
        }
        const encryptedDocument = await encryptWithKeyDerivedFromString({
            passphrase: key,
            data: utf8ToBytes(document),
            strategy: CipherStrategy.AES_GCM,
            serializationVersion: SerializationFormat.latest_version,
        });
        document = encryptedDocument.serialized;
        const buffer = Buffer.from(document) as any;
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public async loadDocuments(
        documents: string[],
        key: string
    ): Promise<DiscussionMessage> {
        const decrypted = await decryptWithKeyDerivedFromString({
            serialized: documents[0],
            passphrase: key,
        });
        this.document = bytesToUtf8(decrypted);
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): DiscussionMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return DiscussionMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: DiscussionMessageBody): DiscussionMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new DiscussionMessage(json.action);
        message = DiscussionMessage._fromMessageObject(message, json);
        return message;
    }

    /**
     * From message object
     * @param message
     * @param json
     */
    protected static override _fromMessageObject<T extends Message>(message: T, json: DiscussionMessageBody): T {
        const _message: DiscussionMessage = super._fromMessageObject(message, json) as any;
        _message._id = json.id;
        _message._status = json.status;
        _message.hash = json.hash;
        _message.target = json.target;
        _message.relationships = json.relationships;
        const urls = [
            {
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid,
            },
        ];
        _message.setUrls(urls);
        return _message as any;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.getUrls()[0];
    }

    /**
     * Validate
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * Get document URL
     * @param type
     */
    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.hash = this.hash;
        result.target = this.target;
        result.relationships = this.relationships;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): DiscussionMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new DiscussionMessage(json.action), json);
        result.hash = json.hash;
        result.target = json.target;
        result.relationships = json.relationships;
        result.document = json.document;
        return result;
    }
}
