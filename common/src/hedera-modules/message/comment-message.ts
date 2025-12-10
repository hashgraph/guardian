import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { CommentMessageBody } from './message-body.interface.js';
import {
    bytesToUtf8,
    CipherStrategy,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
    utf8ToBytes,
} from '@meeco/cryppo';
import { SerializationFormat } from '@meeco/cryppo/dist/src/serialization-versions.js';
import { IPFS } from '../../helpers/index.js';
import { PolicyComment } from '../../entity/index.js';

/**
 * Discussion message
 */
export class CommentMessage extends Message {
    /**
     * Parent message id
     */
    public target: string;

    /**
     * Parent message id
     */
    public hash: string;

    /**
     * Discussion message id
     */
    public discussion: string;

    /**
     * Document
     */
    public document: any;

    constructor(action: MessageAction) {
        super(action, MessageType.PolicyComment);
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: PolicyComment): void {
        this.hash = document.hash;
        this.target = document.target || '';
        this.discussion = document.discussionMessageId || '';
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
    public override toMessageObject(): CommentMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            hash: this.hash,
            target: this.target,
            discussion: this.discussion,
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
    ): Promise<CommentMessage> {
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
    public static fromMessage(message: string): CommentMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return CommentMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: CommentMessageBody): CommentMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new CommentMessage(json.action);
        message = CommentMessage._fromMessageObject(message, json);
        return message;
    }

    /**
     * From message object
     * @param message
     * @param json
     */
    protected static override _fromMessageObject<T extends Message>(message: T, json: CommentMessageBody): T {
        const _message: CommentMessage = super._fromMessageObject(message, json) as any;
        _message._id = json.id;
        _message._status = json.status;
        _message.hash = json.hash;
        _message.target = json.target;
        _message.discussion = json.discussion;
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
        result.discussion = this.discussion;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): CommentMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new CommentMessage(json.action), json);
        result.hash = json.hash;
        result.target = json.target;
        result.discussion = json.discussion;
        result.document = json.document;
        return result;
    }
}
