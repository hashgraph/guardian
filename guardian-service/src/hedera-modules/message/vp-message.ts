import { VpDocument } from '../vcjs/vp-document';
import { Message } from './message';
import { IURL, UrlType } from "./i-url";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";

export class VPMessage extends Message {
    public vpDocument: VpDocument;
    public document: any;
    public hash: string;
    public issuer: string;

    constructor(action: MessageAction) {
        super(action, MessageType.VPDocument);
    }

    public setDocument(document: VpDocument): void {
        this.vpDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
        this.issuer = document.getIssuerDid();
    }

    public getDocument(): any {
        return this.document;
    }

    public toMessage(): string {
        return JSON.stringify({
            action: this.action,
            type: this.type,
            issuer: this.issuer,
            cid: this.getDocumentUrl(UrlType.cid),
            url: this.getDocumentUrl(UrlType.url),
        });
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
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): VPMessage {
        const message = new VPMessage(json.action);
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
