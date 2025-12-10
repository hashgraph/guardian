import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { DidMessageBody } from './message-body.interface.js';
import { Hashing } from '../hashing.js';
import { IPFS } from '../../helpers/index.js';
import { CommonDidDocument } from '../vcjs/index.js';

/**
 * DID message
 */
export class DIDMessage extends Message {
    /**
     * Document
     */
    public document: any;
    /**
     * DID document
     */
    public didDocument: CommonDidDocument;
    /**
     * DID
     */
    public did: string;
    /**
     * Relationships
     */
    public relationships: string[];

    constructor(action: MessageAction) {
        super(action, MessageType.DIDDocument);
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: CommonDidDocument): void {
        this.didDocument = document;
        this.document = document.getDocument();
        this.did = document.getDid();
    }

    /**
     * Set relationships
     * @param ids
     */
    public setRelationships(ids: string[]): void {
        this.relationships = ids;
    }

    /**
     * Get document
     */
    public getDocument(): any {
        return this.document;
    }

    /**
     * To message object
     */
    public override toMessageObject(): DidMessageBody {
        const item: DidMessageBody = {
            id: this._id,
            status: this._status,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            did: this.did,
            cid: this.getUrls()[0]?.cid,
            uri: this.getUrls()[0]?.url
        };
        if (this.relationships && this.relationships.length) {
            item.relationships = this.relationships;
        }
        return item;
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        const json = JSON.stringify(this.document);
        const buffer = Buffer.from(json);
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): DIDMessage {
        if (documents && Array.isArray(documents)) {
            this.document = JSON.parse(documents[0]);
        }
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): DIDMessage {
        if (!message) {
            throw new Error('JSON Object is empty');
        }

        const json = JSON.parse(message);
        return DIDMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: DidMessageBody): DIDMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new DIDMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;

        message.did = json.did;
        message.relationships = json.relationships;
        const urls = [{
            cid: json.cid,
            url: IPFS.IPFS_PROTOCOL + json.cid
        }]
        message.setUrls(urls);
        return message;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.getUrls()[0];
    }

    /**
     * Validation
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * To hash
     */
    public override toHash(): string {
        const map: any = {
            status: this._status,
            type: this.type,
            action: this.action,
            lang: this.lang,
            did: this.did
        }
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    /**
     * Relationship message
     */
    public getRelationships(): string[] {
        return this.relationships || [];
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.did = this.did;
        result.relationships = this.relationships;
        result.document = this.document;
        return result;
    }

    public static fromJson(json: any): DIDMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new DIDMessage(json.action), json);
        result.did = json.did;
        result.relationships = json.relationships;
        result.document = json.document;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.did;
    }
}
