import { DIDDocument } from './../vcjs/did-document';
import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { DidMessageBody } from './message-body.interface';

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
    public didDocument: DIDDocument;
    /**
     * DID
     */
    public did: string;

    constructor(action: MessageAction) {
        super(action, MessageType.DIDDocument);
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: DIDDocument): void {
        this.didDocument = document;
        this.document = document.getDocument();
        this.did = document.getDid();
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
        return {
            id: this._id,
            status: this._status,
            type: this.type,
            action: this.action,
            lang: this.lang,
            did: this.did,
            cid: this.urls[0].cid,
            url: this.urls[0].url
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
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
        const urls = [{
            cid: json.cid,
            url: json.url
        }]
        message.setUrls(urls);
        return message;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.urls[0];
    }

    /**
     * Validation
     */
    public override validate(): boolean {
        return true;
    }
}
