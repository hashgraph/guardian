import { VpDocument } from '../vcjs/vp-document';
import { Message } from './message';
import { IURL, UrlType } from "./url.interface";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";
import { MessageBody, VpMessageBody } from './message-body.interface';

export class VPMessage extends Message {
    public vpDocument: VpDocument;
    public document: any;
    public hash: string;
    public issuer: string;
    public relationships: string[];

    constructor(action: MessageAction) {
        super(action, MessageType.VPDocument);
    }

    public setDocument(document: VpDocument): void {
        this.vpDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
        this.issuer = document.getIssuerDid();
    }

    public setRelationships(ids: string[]): void {
        this.relationships = ids;
    }

    public getDocument(): any {
        return this.document;
    }

    public override toMessageObject(): VpMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            issuer: this.issuer,
            relationships: this.relationships,
            cid: this.getDocumentUrl(UrlType.cid),
            url: this.getDocumentUrl(UrlType.url),
        };
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        const json = JSON.stringify(this.document);
        const buffer = Buffer.from(json);
        return [buffer];
    }

    public loadDocuments(documents: string[]): VPMessage {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    public static fromMessage(message: string): VPMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: VpMessageBody): VPMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const message = new VPMessage(json.action);
        message._id = json.id;
        message._status = json.status;
        message.issuer = json.issuer;
        message.relationships = json.relationships;
        const urls = [{
            cid: json.cid,
            url: json.url
        }]
        message.setUrls(urls);
        return message;
    }

    public override getUrl(): IURL {
        return this.urls[0];
    }

    public override validate(): boolean {
        return true;
    }

    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }
}
