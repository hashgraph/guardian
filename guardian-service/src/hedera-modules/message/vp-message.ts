import { VpDocument } from '../vcjs/vp-document';
import { Message } from './message';
import { IURL, UrlType } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { VpMessageBody } from './message-body.interface';
import { IPFS } from '@helpers/ipfs';

/**
 * VP message
 */
export class VPMessage extends Message {
    /**
     * VP document
     */
    public vpDocument: VpDocument;
    /**
     * Document
     */
    public document: any;
    /**
     * Hash
     */
    public hash: string;
    /**
     * Issuer
     */
    public issuer: string;
    /**
     * Relationships
     */
    public relationships: string[];

    constructor(action: MessageAction) {
        super(action, MessageType.VPDocument);
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: VpDocument): void {
        this.vpDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
        this.issuer = document.getIssuerDid();
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
    public override toMessageObject(): VpMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            issuer: this.issuer,
            relationships: this.relationships,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
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
    public loadDocuments(documents: string[]): VPMessage {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): VPMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return VPMessage.fromMessageObject(json);
    }

    /**
     * From message objects
     * @param json
     */
    public static fromMessageObject(json: VpMessageBody): VPMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new VPMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.issuer = json.issuer;
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
}
